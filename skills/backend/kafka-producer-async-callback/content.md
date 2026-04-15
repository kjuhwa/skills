# Async Kafka send with delivery callback

## Use case
Audit log, domain events, downstream notifications — messages that matter but must never slow the user-facing request. You want at-least-once behaviour **without** blocking the thread waiting for the broker ack.

## Shape (Spring Kafka ≥ 3.x)

```java
@Component
@RequiredArgsConstructor
public class AuditKafkaProducer {
  private final KafkaTemplate<String, Object> kafka;

  public void send(String topic, String key, Object payload) {
    CompletableFuture<SendResult<String, Object>> fut = kafka.send(topic, key, payload);
    fut.whenComplete((result, ex) -> {
      if (ex != null) {
        log.error("kafka send failed topic={} key={}", topic, key, ex);
        // optional: dead-letter to local file / retry queue
      } else {
        log.debug("kafka send ok topic={} offset={}", topic,
            result.getRecordMetadata().offset());
      }
    });
  }
}
```

## Gotchas
- Spring Kafka 2.x returned `ListenableFuture`; 3.x returns `CompletableFuture`. Don’t mix — `.addCallback` is gone.
- If the producer’s internal buffer is full, `.send()` itself can block (up to `max.block.ms`). Lower it for non-blocking intent: `properties.max.block.ms=1000`.
- `whenComplete` runs on the producer’s I/O thread — keep the body cheap. Heavy work must `.thenAcceptAsync(..., executor)`.
- For audit use cases, set `acks=all` + `enable.idempotence=true`; for hot-path events, `acks=1` is fine.

## Counter / Caveats
- Don’t use this for commands that must succeed before returning HTTP 200 — use synchronous `.get(timeout)` there and surface failures.
- For high-volume fire-and-forget, the Kafka transactional outbox pattern (DB row → CDC) is more durable.
