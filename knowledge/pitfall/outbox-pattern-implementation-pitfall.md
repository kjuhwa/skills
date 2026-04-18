---
version: 0.1.0-draft
name: outbox-pattern-implementation-pitfall
description: Common outbox implementation failures around ordering, stuck rows, and at-least-once semantics
category: pitfall
tags:
  - outbox
  - auto-loop
---

# outbox-pattern-implementation-pitfall

The most common pitfall is assuming the outbox gives you exactly-once delivery — it does not. The relay can crash between "broker ack received" and "UPDATE outbox SET status=PUBLISHED", so on restart it republishes the same row. Downstream consumers MUST be idempotent (dedup by event `id` or a business idempotency key). Teams frequently skip this and end up with duplicate order confirmations or double-charged payments in production. Related: if you use `PROCESSING` as an intermediate state without a timeout sweep, a crashed relay leaves rows stuck forever — always run a reconciliation job that resets `PROCESSING` rows older than e.g. 5 minutes back to `PENDING`.

Ordering is the second trap. A naive relay that polls `WHERE status='PENDING' ORDER BY id LIMIT 100` and publishes them concurrently will reorder events for the same aggregate. If downstream cares about per-aggregate order (almost always true for entity lifecycle events), you must either publish sequentially within a poll batch, partition the broker topic by `aggregate_id`, or serialize per-aggregate in the relay. Debezium/CDC-based relays inherit the transaction log order for free, which is one reason to prefer them over polling for high-ordering-sensitivity domains.

The third pitfall is putting the outbox table in a separate database or schema from the business data. This breaks the entire guarantee — the whole point is that the business write and the outbox insert share one local transaction. If they're in separate datasources, you're back to dual-write / two-phase-commit territory and gain nothing over publishing directly to Kafka. Also avoid giant payloads in the outbox row (>1MB); instead store a reference and let consumers fetch the current aggregate state, since by publish time the payload may already be stale.
