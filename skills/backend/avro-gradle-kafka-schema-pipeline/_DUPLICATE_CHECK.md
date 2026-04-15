# Duplicate check

This skill overlaps topically with the existing `skills/backend/kafka-producer-config-avro-schema-registry`.

- **This skill (`avro-gradle-kafka-schema-pipeline`)**: focuses on the **build-side** — `davidmc24` Gradle Avro plugin config, `.avsc` → Java codegen, `createSetters = false`, and Confluent Maven repo wiring.
- **Existing (`kafka-producer-config-avro-schema-registry`)**: focuses on the **runtime-side** — Kafka producer properties (LZ4, 30 MB max request size, acks=1, Schema Registry URL).

They are complementary, not substitutes. Reader who needs both: start with this one to generate Java classes, then apply the other for producer config. Consider consolidating into a single "avro-on-kafka end-to-end" skill if duplication grows.
