---
version: 0.1.0-draft
name: kafka-batch-size-timeout-tuning
description: Lowering Spring Kafka max-poll-records (e.g. 200→10) on heavy-processing consumers prevents max.poll.interval.ms timeouts and rebalance storms
category: decision
source:
  kind: project
  ref: lucida-alarm@d6ae7d27
confidence: high
linked_skills:
  - kafka-batch-consumer-partition-tuning
tags: [kafka, spring-kafka, max-poll-records, max-poll-interval-ms, rebalance]
---

**Fact:** Reduced `max-poll-records` from 200 to 10 for the high-volume measurement consumer to keep `poll()` cadence well inside `max.poll.interval.ms` (default 5 min). Per-poll overhead in Spring Kafka is low, so shrinking the batch does not hurt throughput; it just polls more often.

**Why:** Each measurement record is pushed into a bounded queue behind a thread pool. A batch of 200 heavy records could block the consumer thread long enough to breach `max.poll.interval.ms`, triggering a group rebalance and a re-delivery storm. Smaller batches mean more frequent polls, keeping the consumer alive under load.

**How to apply:**
- Applies when per-record work is heavy (DB writes, alarm evaluation, remote calls). For cheap per-record work, shrinking the batch wastes broker round-trips.
- Combine with partition-count tuning (see `kafka-partition-topology-design`) so concurrency + batch size together fit inside the `max.poll.interval.ms` budget.
- Monitor consumer-lag metrics after a change; a too-small batch plus a too-slow processor will show up as growing lag without any rebalance.

**Evidence:**
- Commit `e4274be5` — "measurement batch 개수를 200 -> 10 으로 변경. poll 오버헤드가 작기 때문에 개수를 줄여서 max.poll.interval.ms 타임아웃 위험을 제거"
- `CLAUDE.md` — Kafka Consumer Settings section.
