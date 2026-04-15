# @WaitForServices — Declarative Startup Gate

Instead of manual `while(!eurekaClient.getInstances(name).isEmpty()) Thread.sleep(1000)` loops, declare dependencies on the event-listener method.

## Shape

```java
@EventListener(ServiceReadyLeaderEvent.class)
@WaitForServices(
    requireLeader   = true,
    requiredServices = {"metadata-service", "auth-service"},
    maxRetries      = 30,
    checkHealth     = true,
    checkReadiness  = true
)
public void onLeaderReady() {
    // runs exactly once, only on leader, only after both services are READY
}
```

## What the annotation must do

- Resolve each required service via the discovery client.
- For each instance, hit `/actuator/health` (or the framework's ServiceStatusProvider endpoint) and confirm `status=UP`/`RUNNING`.
- Retry with backoff up to `maxRetries`; fail fast with a clear exception if exceeded.
- If `requireLeader=true`, short-circuit on non-leader nodes (idempotent init).

## Why declarative

- Replaces dozens of custom wait-loops scattered across services.
- Makes dependencies **visible in code** — easy to audit "what does this service boot against?"
- Central place to instrument startup latency metrics.

## Combine with

- `tenant-db-initialization-on-startup` — common consumer of this gate.
- `service-status-provider-actuator` — what the annotation pings.
