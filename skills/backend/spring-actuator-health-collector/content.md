# spring-actuator-health-collector

## Shape

Each **Target** is a row with: `serviceUrl`, `actuatorBasePath`, `healthEndpoint`, `metricsEndpoint`, `connectTimeout`, `socketTimeout`, `metricsToCollect: List<String>`, `additionalHeaders`, `enabled`, `tags`.

Collector loop per target:

1. `GET {serviceUrl}{healthEndpoint}` → parse `status` + `components.*.status` → availability measurement (`status=1/0`, `responseTime=ms`).
2. For each metric name in `metricsToCollect`: `GET {serviceUrl}{metricsEndpoint}/{name}` → extract `measurements[0].value` → metric measurement.
3. Bundle per-target results into one batch message (one Kafka/queue send per target, NOT per metric — see `measurement-batch-send-per-config` knowledge).
4. Stamp `targetId`, `organizationId`, `timestamp`; publish.

## Steps

1. Model `HealthTarget` with per-target timeout fields; defaults: `connectTimeout=10_000`, `socketTimeout=30_000`. Override with aggressive values (100–1000ms) when target is on-LAN and SLA demands fast-fail — see pitfall `actuator-metric-call-aggressive-timeout`.
2. Single shared `OkHttpClient` bean with `ConnectionPool(10, 5 min)` and `retryOnConnectionFailure(true)`; clone `.newBuilder()` per call to apply per-target timeouts.
3. Do not attach target `authConfig` to `/actuator/**` calls by default — see decision `actuator-endpoints-skip-auth-by-design`. Apply `additionalHeaders` always.
4. Parse metric response as JSON; guard against `measurements` absent or empty.
5. Normalize units per metric at the collector, not downstream (e.g. `system.cpu.usage` is 0..1 → multiply ×100 for percent).
6. Skip collection if previous run for same target is still in-flight — see pitfall `skip-schedule-if-previous-running`.

## Counter / Caveats

- Not all Actuator metrics are scalar; composite ones (`jvm.memory.used` with multiple tags) need tag-aware aggregation.
- `/actuator/threaddump` and `/actuator/heapdump` are **slow and heavy**; use a separate client instance with longer timeouts; never bundle them with the fast metric loop.
- Spring Boot security may hide `/actuator/env` and `/actuator/configprops` even when `/health` is open; treat 401/403 as non-fatal for optional endpoints.

## Test hooks

- Replace target with `okhttp3.mockwebserver.MockWebServer` and queue canned `/actuator/health` + `/actuator/metrics/{name}` responses.
- Assert: timeout override from target fields takes effect; disabled target produces no HTTP call; all-metrics bundle emits exactly one downstream message.
