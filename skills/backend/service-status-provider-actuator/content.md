# ServiceStatusProvider — DB + Kafka liveness

Implement the framework's `ServiceStatusProvider` (or a custom `HealthIndicator`) so an orchestrator-level endpoint can distinguish "process up" from "business logic ready".

## Shape

```java
@Component
public class AuditServiceStatusProvider implements ServiceStatusProvider {
    private final MongoTemplate mongoTemplate;
    private final KafkaListenerEndpointRegistry registry;

    public Status check() {
        if (!pingMongo()) return Status.DOWN;
        long total   = registry.getListenerContainers().size();
        long running = registry.getListenerContainers().stream()
                               .filter(MessageListenerContainer::isRunning).count();
        return (running == total && total > 0) ? Status.RUNNING : Status.READY;
    }
}
```

## Semantics

- **DOWN** — external dependency unavailable; take out of LB.
- **READY** — process started, containers not yet attached (e.g., waiting for topics). LB can route, but the service will lag.
- **RUNNING** — everything green; include in active rotation.

## Why not stock HealthIndicator

Spring Boot Actuator conflates liveness/readiness with external dependency health. A tri-state provider lets the orchestrator (Eureka sync, K8s readiness, custom dashboard) make smarter routing decisions during rolling restarts.

## Don't

- Don't put Kafka connection tests inside the health check path — use `isRunning()` on the container, which is non-blocking.
- Don't call `mongoTemplate.getCollectionNames()` to ping; use `executeCommand("{ ping: 1 }")` which is cheap and doesn't require auth on admin DB.
