# Bean
```java
@Bean
public ProducerFactory<String, SpecificRecord> producerFactory(KafkaProperties props) {
    Map<String, Object> cfg = new HashMap<>(props.buildProducerProperties());
    cfg.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
    cfg.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, KafkaAvroSerializer.class);
    cfg.put(AbstractKafkaSchemaSerDeConfig.SCHEMA_REGISTRY_URL_CONFIG,
            props.getProperties().get("schema.registry.url"));
    cfg.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "gzip");
    cfg.put(ProducerConfig.MAX_REQUEST_SIZE_CONFIG, 30 * 1024 * 1024);
    return new DefaultKafkaProducerFactory<>(cfg);
}
```

## Broker side
`message.max.bytes` and `replica.fetch.max.bytes` must be `>= max.request.size`,
otherwise the broker rejects the batch with `RecordTooLargeException`.

## Consumer side
Consumer `fetch.max.bytes` and `max.partition.fetch.bytes` must also be raised;
otherwise consumers will stall on a partition with one oversized record.

## Counter / Caveats
- Gzip adds ~5–15 % CPU on the producer; measure before adopting on a hot path.
- If you only have a few large messages, consider chunking at the app layer instead of
  raising broker-wide limits.
