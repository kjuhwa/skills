# Discovery-driven replica & leader lifecycle events

## Why
`ApplicationReadyEvent` only fires once per instance. If you need to react when "the 2nd replica came online" or "we are now the only survivor" (to take over leader-only work mid-flight), you need a discovery-polling layer that publishes semantic events.

## Shape

```java
@Component
@RequiredArgsConstructor
class ServiceDiscoveryEventListener {
  private final DiscoveryClient discovery;
  private final ApplicationEventPublisher events;
  private final Map<String, Set<String>> lastKnown = new ConcurrentHashMap<>();

  @Scheduled(fixedDelay = 10_000)
  public void poll() {
    for (String svc : discovery.getServices()) {
      Set<String> now = discovery.getInstances(svc).stream()
          .map(ServiceInstance::getInstanceId).collect(toSet());
      Set<String> prev = lastKnown.getOrDefault(svc, Set.of());

      Set<String> joined = diff(now, prev);
      Set<String> left   = diff(prev, now);

      joined.forEach(id -> events.publishEvent(new ServiceReplicaUpEvent(svc, id)));
      left  .forEach(id -> events.publishEvent(new ServiceReplicaDownEvent(svc, id)));

      if (!now.isEmpty() && prev.isEmpty())
        events.publishEvent(new ServiceLeaderElectedEvent(svc, firstInstance(now)));
      if (now.isEmpty() && !prev.isEmpty())
        events.publishEvent(new ServiceReplicaAllDownEvent(svc));

      lastKnown.put(svc, now);
    }
  }
}
```

## Gotchas
- Poll interval ≥ Eureka `renewal-interval-in-seconds` or you'll emit flapping events from stale caches.
- "Leader" here is deterministic (first alphabetical instance ID) — cheap but not fault-tolerant under split-brain. For real leadership use Zookeeper/Consul/Redis Redlock.
- Guard publishEvent with try/catch; a single listener exception must not kill the poll.
- Event handlers must be `@Async` or they serialize every poll tick.

## Counter / Caveats
- Don't re-invent Spring Cloud Bus if your use case is "broadcast config refresh". This pattern is for *local reaction to topology changes*, not broadcast.
- If your service registry is k8s (endpoints), prefer the k8s Informer pattern — it streams changes instead of polling.
