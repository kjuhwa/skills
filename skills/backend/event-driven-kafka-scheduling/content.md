# event-driven-kafka-scheduling

## Shape

- **Registration**: worker sends `RequestScheduleJob{jobId, cronOrInterval, topic}` to a central scheduler (e.g. meta-service).
- **Tick**: scheduler publishes `JobExecuteNotice{jobId, triggeredAt}` to `{topic}` on every tick.
- **Execution**: worker listens on `{topic}`; each record is one tick. Handler extends a base event class so multiple concerns can react.

## Steps

1. Model `JobExecuteNotice` as the Avro/Kafka contract: `jobId`, `triggeredAt`, `organizationId` (in record header, see `kafka-organization-id-record-header`).
2. Register schedule **once** at startup — never re-register per tick. De-duplicate on `jobId`.
3. Listener maintains a per-`jobId` in-flight flag (`AtomicBoolean` or `Set<String>`). On tick: `if (!inFlight.compareAndSet(false, true)) return;` then handle in try/finally that clears it. See pitfall `skip-schedule-if-previous-running`.
4. Long-running work goes onto a bounded executor; do not block the Kafka consumer thread.
5. On graceful shutdown: stop accepting new notices, drain in-flight, then commit offsets.

## Why (not @Scheduled)

- Central cron is authoritative across a fleet of replicas — no need for distributed locks per job.
- Schedule can be changed server-side and reloaded without redeploying workers.
- Missed ticks are observable as Kafka lag, not silent skips.

## Counter / Caveats

- Kafka retention must cover worker outage window, otherwise ticks during downtime are lost — accept this or switch consumer to `auto.offset.reset=latest`.
- Per-tick exactly-once is not guaranteed; handler must be idempotent (keyed by `jobId + triggeredAt`).
- Scheduler service becomes a dependency — workers must survive its absence (log + no-op, not crash).

## Test hooks

- `spring-kafka-test` embedded broker: publish synthetic `JobExecuteNotice`s; assert handler runs.
- Overlap test: block handler with latch, fire second notice before first completes, assert second is skipped, not queued.
