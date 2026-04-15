# Two-phase readiness init (leader vs per-instance)

## Problem
You run N replicas. Some init work is **per instance** (warm caches, open sockets, register metrics), other work is **cluster-wide** (insert seed data, register default entities, migrate collections). Running cluster-wide work on every instance causes duplicate rows, race conditions, or conflicting IDs.

## Shape
Split into two listeners, gated by a leader-election flag (Redis `SETNX` with TTL, ZooKeeper ephemeral, or Eureka first-alphabetical instance):

```java
@Component
@RequiredArgsConstructor
class ServiceReadyListener {
  private final LeaderElection leader;
  private final List<PerInstanceInitTask> perInstance;
  private final List<LeaderOnlyInitTask> leaderOnly;

  @EventListener(ApplicationReadyEvent.class)
  public void onReady() {
    perInstance.forEach(PerInstanceInitTask::run);      // always

    if (leader.acquire(Duration.ofMinutes(5))) {        // once per cluster
      try { leaderOnly.forEach(LeaderOnlyInitTask::run); }
      finally { /* keep the lock — release on shutdown */ }
    }
  }
}
```

Mark tasks with a marker interface so each module contributes its own without editing the listener:

```java
public interface PerInstanceInitTask { void run(); }
public interface LeaderOnlyInitTask  { void run(); }
```

## Gotchas
- Don’t block `ApplicationReadyEvent` on slow work — offload via `@Async` with a dedicated executor so liveness probes don’t fail.
- Leader lock TTL must exceed worst-case init time. On renewal failure, abort — don’t silently proceed without the lock.
- Default seeds must be **idempotent** (upsert, not insert). The leader may crash mid-init and a second leader retries.

## Counter / Caveats
- For pure schema/seed work, a Kubernetes `Job` or a Flyway/Liquibase migration is simpler than runtime leader election.
- Using `@WaitForServices`-style "wait for downstream Eureka registration" only works when downstreams are actually registered — add timeout + fail-open so a missing downstream doesn’t block forever.
