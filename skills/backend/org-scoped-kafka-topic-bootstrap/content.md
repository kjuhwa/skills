# Org-Scoped Kafka Topic Bootstrap

## Problem
Multi-tenant topic-per-tenant provisioning: on startup the service needs topics for every existing tenant; at runtime new tenants must get their topics without restart. Different topic classes need different retention (e.g. short for scatter summaries, long for metrics).

## Pattern
- Bootstrap phase gated on service readiness — don't attempt topic creation before broker discovery is done.
- Topic name convention: `{CLASS}.{tenantId}` (e.g. `COMMON_SCATTER.12345`).
- Retention is a property of the class, hardcoded/config-mapped, not per-tenant.
- Runtime tenant events (e.g. `TenantCreated` Kafka message consumed from an admin topic) invoke the same creation function.

## Steps
1. Factor a `createTopicsForOrg(orgId)` method that, for each topic class, calls `AdminClient.createTopics(List<NewTopic>)` with class-specific `partitions`, `replicationFactor`, and `configs` (notably `retention.ms`).
2. Gate bootstrap with a readiness annotation/aspect (`@WaitForServices(required=..., maxRetries=N, markAsInitialized=true)`) so it only runs once service discovery is up.
3. At bootstrap, load the tenant list from the authoritative source (DB, admin service), loop `createTopicsForOrg`.
4. Wire a consumer on the tenant-admin topic to call `createTopicsForOrg` on new-tenant events.
5. Make topic creation idempotent — swallow `TopicExistsException`.
6. For local-dev profile, allow skipping or mocking the admin client (no broker required).

## Why this shape
- Separation of "what topics does a tenant have" (class list) from "how many tenants" keeps ops-level changes (retention tweaks) single-file.
- Idempotent creation means restart-after-partial-failure just works.
- Readiness gate avoids the classic race where bootstrap runs before the broker is reachable.

## Anti-patterns
- Creating topics lazily on first produce — first-message latency spikes and retention is whatever the broker default is.
- Encoding tenant in the key but not the topic — one slow tenant back-pressures everyone else.
- Running bootstrap on every instance without a lock — harmless for idempotent create, but noisy if you also set configs.

## Generalize
Any tenant-scoped resource provisioning (Kafka topics, Redis namespaces, S3 prefixes, DB schemas). Bootstrap-plus-event-stream shape works for all.
