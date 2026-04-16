---
name: outbox-pattern-data-simulation
description: Generate deterministic outbox workload fixtures — business events, poller ticks, broker faults — with seeded RNG for reproducible at-least-once demos
category: workflow
triggers:
  - outbox pattern data simulation
tags:
  - auto-loop
version: 1.0.0
---

# outbox-pattern-data-simulation

Drive the simulation from a seeded PRNG and a declarative scenario spec rather than ad-hoc `setInterval` calls. A scenario is `{ seed, durationMs, producers: [{rate, aggregateIds}], faults: [{at, kind, target}], pollerConfig: {batchSize, intervalMs, lockMode} }`. On each virtual tick, producers emit business commands that atomically append `{id, aggregate_id, event_type, payload, created_at, processed_at: null}` rows; the poller drains `WHERE processed_at IS NULL ORDER BY id LIMIT batchSize` under the configured lock (`SELECT FOR UPDATE SKIP LOCKED` vs. optimistic flag vs. none) so users can compare contention behavior.

Inject faults as data, not as code branches: a `broker_timeout` fault at tick 120 simply flips a flag the publish step reads, producing a replay where the same `outbox_id` re-appears in the next poll. Record every state transition into an append-only event log keyed by `(tick, outbox_id, from_state, to_state, reason)` — this log is both the UI's data source and the golden artifact for assertions like "exactly one `PUBLISHED` event per `outbox_id`" or "consumer saw `aggregate_id=X` in monotonic `created_at` order within a single partition."

Separate the **intended** guarantees (at-least-once, per-aggregate order, no message loss on relay crash) from **optional** guarantees (exactly-once via consumer dedupe, global order) and expose them as toggles that flip specific scenario parameters — enabling "global order" collapses the poller to `batchSize=1`, enabling "dedupe" adds an idempotency table the consumer writes before acking. This makes the pattern's trade-offs operable, not just described.
