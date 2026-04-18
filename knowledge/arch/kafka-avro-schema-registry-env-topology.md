---
version: 0.1.0-draft
tags: [arch, kafka, avro, schema, registry, env]
name: kafka-avro-schema-registry-env-topology
category: arch
summary: Kafka uses Avro + Confluent Schema Registry; partition and replication counts are environment-driven.
source:
  kind: project
  ref: lucida-account@f1efa2ba
---

# Kafka Topology: Avro + Schema Registry, Env-Driven Sizing

**Fact.** All Kafka traffic serializes via Avro against a Confluent Schema Registry. `KAFKA_TOPIC_NUM_PARTITIONS` and `KAFKA_TOPIC_REPLICATION_FACTOR` are environment variables, not hardcoded. Producer uses GZIP compression; consumers wrap the Avro deserializer in `ErrorHandlingDeserializer` to prevent poison-pill crashes.

**Why.** Avro enforces schema evolution discipline across services. Env-driven sizing matters because local (replication=1, partitions=3) differs from prod (replication=3). `ErrorHandlingDeserializer` is non-negotiable: a single malformed payload would otherwise kill the consumer thread and back up the partition forever.

**How to apply.** New topics: register an Avro schema FIRST, publish via Gradle avro plugin. Never use `StringSerializer` / JSON for event streams — only for admin/debug topics. Any consumer added must chain through `ErrorHandlingDeserializer`.
