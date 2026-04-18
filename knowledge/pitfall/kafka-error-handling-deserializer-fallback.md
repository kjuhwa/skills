---
version: 0.1.0-draft
tags: [pitfall, kafka, error, handling, deserializer, fallback]
name: kafka-error-handling-deserializer-fallback
category: pitfall
summary: Wrap Avro/JSON deserializers in ErrorHandlingDeserializer so a single bad record doesn't poison the consumer and crash-loop the container
source:
  kind: project
  ref: lucida-audit@65ff568
  path: src/main/resources/application.yml
confidence: high
---

# Fact

Kafka consumer deserializer config uses `ErrorHandlingDeserializer` as the outer type, delegating to `StringDeserializer` (keys) and `KafkaAvroDeserializer` (values).

```yaml
key-deserializer:   org.springframework.kafka.support.serializer.ErrorHandlingDeserializer
value-deserializer: org.springframework.kafka.support.serializer.ErrorHandlingDeserializer
spring.deserializer.key.delegate.class:   org.apache.kafka.common.serialization.StringDeserializer
spring.deserializer.value.delegate.class: io.confluent.kafka.serializers.KafkaAvroDeserializer
```

# Why

Without this, a single malformed record (schema evolution mismatch, stray non-Avro message, truncated payload) throws from the deserializer BEFORE the `@KafkaListener` method sees it. Spring Kafka can't offset-commit a record it couldn't parse, so the container re-reads it forever, blocking every subsequent record on that partition.

With `ErrorHandlingDeserializer`, the bad record surfaces to the listener wrapped in a `DeserializationException` — pair it with a `DefaultErrorHandler` + DLT (dead-letter topic) and the pipeline keeps flowing.

# How to apply

- Combine with `@DltHandler` or `DeadLetterPublishingRecoverer` bean to archive bad records.
- Log at WARN with partition/offset — auditable evidence for schema-registry contract violations.
- Don't catch and swallow — you lose the evidence trail.

# Counter / Caveats

- `ErrorHandlingDeserializer` adds a small per-record allocation. Negligible for audit-class throughput; measure before ruling it out in extreme-TPS paths.
