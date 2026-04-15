# Kafka Producer — Avro + Schema Registry

## Producer properties

```java
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, KafkaAvroSerializer.class);
props.put("schema.registry.url", schemaRegistryUrl);
props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "lz4");
props.put(ProducerConfig.MAX_REQUEST_SIZE_CONFIG, 30 * 1024 * 1024); // 30MB
props.put(ProducerConfig.ACKS_CONFIG, "1");
```

## Tuning rationale

| Setting | Value | Why |
|---------|-------|-----|
| `compression.type` | `lz4` | Best throughput-to-ratio for JSON-like Avro payloads; `zstd` is better for cold storage but slower on the producer. |
| `max.request.size` | 30MB | Audit/log events sometimes batch many records. Default 1MB trips `RecordTooLargeException`. Also raise `message.max.bytes` broker-side. |
| `acks` | `1` | Balances durability and latency for audit ingest. Use `all` when the event is the system of record. |

## Schema registry

- Register schemas via the avro-gradle-plugin pre-build, or rely on `auto.register.schemas=true` in dev only.
- Production: set `auto.register.schemas=false` and use CI to register, so consumers can't accept incompatible drifts silently.

## Combine with callback

```yaml
kafka.use-send-call-back: true
```

Log send failures asynchronously instead of blocking producer thread.
