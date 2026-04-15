# Kafka + Avro Config With Topic Auto-Create

## Goal
Service starts in an empty Kafka cluster (dev, CI) without manual topic provisioning, while still being safe in prod (idempotent, uses admin client).

## Config bean checklist
- `ConsumerFactory` with `StringDeserializer` key, `KafkaAvroDeserializer` value, `schema.registry.url` from env.
- `ConcurrentKafkaListenerContainerFactory` with `AckMode.MANUAL_IMMEDIATE`, concurrency = 3 (tune per partition count), `DefaultErrorHandler` with dead-letter publish.
- `ProducerFactory` with matching Avro serializer; enable idempotence, `acks=all`, `retries>0`.
- `KAFKA_USE_SEND_CALL_BACK` toggle for local dev (off) vs prod (on) — see `build.gradle` bootRun block.

## Topic auto-create
```java
@Bean
ApplicationRunner topicCreator(AdminClient admin, KafkaTopicProps props) {
  return args -> admin.createTopics(props.topics().stream()
      .map(t -> new NewTopic(t.name(), t.partitions(), t.replicationFactor()))
      .toList()).all().get();
}
```
- Partitions and replication from env: `KAFKA_TOPIC_NUM_PARTITIONS`, `KAFKA_TOPIC_REPLICATION_FACTOR` (1 for local, 3 for prod).
- Swallow `TopicExistsException`, rethrow everything else.

## Counter / Caveats
- Do NOT call `createTopics` on every bean startup in a multi-instance deployment — rely on Kafka broker idempotency (it's safe) but log a single info line, not a stack trace.
- For schema evolution use `avro.java.string=String` in the `.avsc` and `createSetters=false, fieldVisibility=PRIVATE` in the Gradle avro plugin — keeps generated DTOs immutable.
- Manual ack + error handler: if you use `AckMode.RECORD` the error handler's retry semantics change — don't mix.
