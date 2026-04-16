---
name: outbox-pattern-implementation-pitfall
description: Common outbox failure modes — non-atomic writes, unbounded retries, poller contention, missing dedupe — and how each manifests
category: pitfall
tags:
  - outbox
  - auto-loop
---

# outbox-pattern-implementation-pitfall

The canonical mistake is splitting the business write and the outbox insert across two transactions (or two datasources), which silently degrades the pattern to "dual write" and reintroduces the exact inconsistency outbox was meant to prevent. A related subtler variant: inserting into the outbox inside a `@Transactional` method but publishing to the broker *before* the Spring transaction commits (e.g., from an `afterReturning` advice that fires pre-commit on some proxy configurations), so the consumer sees an event for a row the DB later rolled back. Always publish from a *separate* process reading committed rows — never from the producing transaction itself, even "just for latency."

Poller design traps are equally costly. Using a plain `SELECT ... WHERE processed_at IS NULL` without `FOR UPDATE SKIP LOCKED` (or an equivalent leased-row flag) causes every relay replica to fetch the same batch, publishing each message N times and hammering the DB; conversely, holding a global advisory lock serializes the whole relay and caps throughput at single-node capacity. Batch size interacts with this: large batches improve throughput but a single poison message in the batch can stall the whole relay if the code marks rows processed only after the *entire* batch publishes successfully — mark per-row, with a bounded retry counter and a dead-letter column, or one bad payload blocks forever.

Finally, outbox guarantees at-least-once, never exactly-once, yet teams routinely forget the consumer side. Without an idempotency key check (usually `outbox_id` persisted in a consumer-side `processed_events` table before side effects), a relay crash between `publish` and `UPDATE outbox SET processed_at=now()` will legitimately re-deliver and double-apply. Also watch for table growth: an outbox with no archival job becomes the largest table in the database within months, and `WHERE processed_at IS NULL` degrades from index-seek to full-scan once the dead tuples accumulate past autovacuum's reach — partition by day or move processed rows to an archive table on a schedule.
