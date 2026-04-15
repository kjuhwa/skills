# Reference implementation notes

Source: `lucida-alarm` —
- `config/KafkaConsumerConfig.java` — `batchConcurrentKafkaListenerContainerFactory`, `measurement-topic-num-partitions=9`
- `kafka/KafkaMeasurementConsumer.java` — batch listener entry point

Key commits:
- `e4274be5` — batch 200→10 (rationale: reduce `max.poll.interval.ms` breach risk)
- `5bb07c05` — 9 partitions for measurement topics, 3 for others
