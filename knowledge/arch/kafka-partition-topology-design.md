---
version: 0.1.0-draft
name: kafka-partition-topology-design
description: Asymmetric Kafka partition counts per topic (high for hot-path, default for admin topics) match volume and concurrency needs without over-provisioning
category: arch
source:
  kind: project
  ref: lucida-alarm@d6ae7d27
confidence: high
linked_skills:
  - kafka-batch-consumer-partition-tuning
tags: [kafka, partition, topology, throughput, concurrency]
---

**Fact:** High-volume hot-path topics (measurements, metrics) are provisioned with 9 partitions; lower-volume administrative topics (config changes, events) keep the default 3. Listener concurrency on each is set to match its partition count, yielding 3× parallelism on the hot path compared to uniform 3-partition sizing.

**Why:** Measurement topics carry the ingest firehose and demand the most downstream work (threshold + baseline + frozen evaluation). Nine partitions allows nine listener threads in the container, matching the thread-pool capacity for the async processor. Config topics (e.g. `CM_*`, `CONF_GROUP_*`) are low-churn administrative events and do not benefit from extra partitions — over-partitioning adds ZooKeeper/KRaft metadata and replication cost with zero throughput gain.

**How to apply:**
- Start by classifying each topic by peak throughput and per-record processing cost, not by "what feels reasonable".
- Partition count is hard to shrink without topic recreation; size at ~3× current peak, not 10×.
- Pair with small `max-poll-records` on the hot-path topics to avoid `max.poll.interval.ms` timeouts under load — see `kafka-batch-size-timeout-tuning`.
- Monitor consumer-group rebalance frequency after changes; a good topology produces near-zero unintentional rebalances.

**Evidence:**
- Commit `5bb07c05` — "kafka partition 개수 설정. measurement 만 consumer 9 개 나머지는 기본값 3개로 설정"
- `config/KafkaConsumerConfig.java` — `measurement-topic-num-partitions=9`.
