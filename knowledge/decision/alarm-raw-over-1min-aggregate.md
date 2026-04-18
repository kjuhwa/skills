---
name: alarm-raw-over-1min-aggregate
version: 0.1.0-draft
tags: [decision, alarm, raw, over, 1min, aggregate]
slug: alarm-raw-over-1min-aggregate
category: decision
summary: Alarm judgement reads raw metrics, not 1-minute aggregates — accuracy over storage cost
confidence: high
source:
  kind: project
  ref: lucida-measurement@bc4ed72
links:
  - kafka-consumer-semaphore-chunking
---

# Fact
Alarm evaluation was migrated off 1-minute aggregated metrics onto raw metrics. Aggregation at the minute boundary was hiding sub-minute spikes that should have paged, and delayed alarms by up to the aggregation lag. The trade-off — higher throughput on the alarm consumer — is controlled by a semaphore + chunking backpressure pattern plus a dedicated thread pool.

# Evidence
- Commit `d3edc67` (#110923) — "알람 판별용 metric 데이터 변경 (1분 통계 > raw data)"
- Commit cluster #103732 — semaphore, chunking, thread-pool, timeout-log split, non-metric thread-pool separation
- Commit `dffca79` — added a Kafka topic with 1h retention specifically for the raw alarm path

# How to apply
- Any future "let's aggregate before alarming for cost reasons" proposal should reference this decision; re-opening it requires evidence that spike-miss has become tolerable.
- Alarm path capacity planning uses the raw volume, not aggregated volume.
- The 1h-retention topic exists because raw alarm data is only needed for the evaluation window; don't repurpose it for long-term storage.

# Counter / Caveats
- This is domain-specific (infra monitoring). For business-metric alarms where minute-granularity is the SLO, the aggregated path may still be correct.
