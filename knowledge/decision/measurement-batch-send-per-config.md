---
name: measurement-batch-send-per-config
description: Send one bundled Kafka message per target per tick containing all metrics, instead of one message per (target, metric).
type: decision
category: decision
source:
  kind: project
  ref: lucida-health@9aa4ee8,18315ad
confidence: medium
---

**Fact.** The publishing path was changed from "1 Kafka record per metric" to "1 Kafka record per target carrying all collected metrics for that tick".

**Why.** Per-metric publishing produced O(targets × metrics) records per tick (e.g. 200 targets × 15 metrics = 3000 records/min), saturating the broker and forcing expensive downstream consumer fan-in. Batching reduces broker load ~15×, keeps all metrics of a single tick atomically visible to consumers (no partial-tick reads), and makes downstream joins trivial.

**How to apply.**
- Aggregate per-tick per-target in memory, then publish once.
- Use the target id (or resource id) as the Kafka partition key so all of one target's ticks are ordered.
- Downstream consumer must expect a list payload, not a scalar — schema change is breaking; coordinate.
- Don't batch **across** targets into one mega-record; you lose per-target partitioning and retry granularity.

**Counter / Caveats.** Larger records stress broker `max.message.bytes` and consumer deserialization cost; if a target has 100+ metrics, split by metric group rather than all-in-one. Also, a per-metric failure now poisons the whole target batch for that tick — be sure individual metric extraction errors are caught and attached as nulls rather than aborting the send.
