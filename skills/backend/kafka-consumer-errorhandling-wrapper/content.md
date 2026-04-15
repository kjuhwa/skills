# Why wrap

Without `ErrorHandlingDeserializer`, a `SerializationException` bubbles out of the poll
loop before offsets can be advanced — the consumer re-reads the same record forever.
With the wrapper, the record becomes a `ConsumerRecord` carrying the failure as a
header, and the container's error handler decides: skip, retry, or DLT.

# Full factory

```java
@Bean
public ConcurrentKafkaListenerContainerFactory<String, SpecificRecord> kafkaListenerFactory(
        ConsumerFactory<String, SpecificRecord> cf,
        KafkaTemplate<Object, Object> dlt) {

    var factory = new ConcurrentKafkaListenerContainerFactory<String, SpecificRecord>();
    factory.setConsumerFactory(cf);

    var recoverer = new DeadLetterPublishingRecoverer(dlt);
    var errorHandler = new DefaultErrorHandler(recoverer, new FixedBackOff(1000L, 2));
    errorHandler.addNotRetryableExceptions(DeserializationException.class);
    factory.setCommonErrorHandler(errorHandler);

    return factory;
}
```

# Counter / Caveats
- DLT topic must exist ahead of time; auto-create is usually disabled in prod clusters.
- Don't wrap with `ErrorHandlingDeserializer` and *also* catch inside the `@KafkaListener`
  — you'll swallow the wrapped failure and lose the DLT.
