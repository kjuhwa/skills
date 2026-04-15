# Three ListenerContainerFactory Pattern

Expose three `ConcurrentKafkaListenerContainerFactory` beans so @KafkaListener methods can pick single-record, batch, or broadcast-style consumption via `containerFactory=`.

## Factories

- **standard** — one record at a time, shared consumer group (normal processing).
- **batch** — `factory.setBatchListener(true)`, higher throughput for ingest pipelines.
- **uuid-group** — generates a fresh `group.id = UUID.randomUUID()` at startup so every instance receives every message (broadcast fan-out, cache invalidation).

## Key trick: autoStartup=false

```java
factory.setAutoStartup(false);
```

Then in an `ApplicationRunner` after topics are ensured:

```java
registry.getListenerContainers().forEach(MessageListenerContainer::start);
```

## Why

- Prevents `TopicExistsException`/`UnknownTopicOrPartition` race between listener startup and admin-client topic creation.
- One UUID-group factory enables cache-invalidation events without designing a separate topic-per-instance scheme.
- Batch factory reuses the same bootstrap/deserializer config — no second consumer config class.

## Pitfalls

- Must explicitly start containers — forgetting `start()` leaves listeners silent.
- UUID group means messages are NOT persisted to a durable consumer group; don't use for durable queue semantics.
- Combine with `ErrorHandlingDeserializer` wrapping Avro deserializer to survive schema drift (see `kafka-error-handling-deserializer-fallback` knowledge entry).
