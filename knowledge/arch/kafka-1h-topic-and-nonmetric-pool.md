---
name: kafka-1h-topic-and-nonmetric-pool
version: 0.1.0-draft
tags: [arch, kafka, topic, and, nonmetric, pool]
slug: kafka-1h-topic-and-nonmetric-pool
category: arch
summary: Raw alarm path uses a 1-hour-retention Kafka topic and a dedicated non-metric thread pool — isolates alarm latency from batch ingest
confidence: medium
source:
  kind: project
  ref: lucida-measurement@bc4ed72
links:
  - kafka-consumer-semaphore-chunking
  - alarm-raw-over-1min-aggregate
---

# Fact
Two architectural choices isolate the alarm path from bulk ingest:
1. A dedicated Kafka topic with **1-hour retention** carries raw alarm inputs (vs the default retention on metric topics).
2. A **non-metric** thread pool handles Availability/Trait writes; the alarm path runs on its own executor. One pool stalling cannot starve the other.

Together these keep the "raw-data-driven alarm" decision (see linked decision) operationally viable.

# Evidence
- Commit `dffca79` (#103732) — "Kafka 메시지 1시간만 보관하는 토픽 추가"
- Commit `24464b3` — "non-metric 데이터 저장용 thread-pool 추가"
- Commit `554b725` — "Kafka consumer config 설정 변경"
- Commit `74bd7f2` — "Kafka streams 설정 추가"

# How to apply
- New alarm-adjacent flows belong on the 1h topic; don't reuse long-retention metric topics and inherit its lag behavior.
- Any new workload class (e.g. synthetic-checks) should get its own executor rather than share an existing pool.
- Capacity-plan the two pools independently; a single "unified" pool reintroduces the coupling this arch deliberately avoids.

# Counter / Caveats
- More pools = more tuning surface. Don't split further without a demonstrated isolation need.
