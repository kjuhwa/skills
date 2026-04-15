---
category: arch
summary: Initialization work is deferred until leader status and dependent-service readiness are confirmed via a `@WaitForServices` event listener
source:
  kind: project
  ref: lucida-performance@0536094
confidence: high
---

# Event-driven init: `@WaitForServices` gates bootstrap work

## Fact

Services use `@EventListener`/`ServicesReadyEvent` with a `@WaitForServices(requiredServices={...}, checkHealth=true, checkReadiness=true, requireLeader=true)` annotation to delay scheduler registration, config sync, and other bootstrap work until:

1. Required upstream services (e.g. `account`, `meta`) report **health UP**.
2. They also report **readiness UP**.
3. This node is the **cluster leader** (when `requireLeader=true`).

## Why

Earlier code registered Quartz jobs and Kafka consumers in `@PostConstruct`, before upstream services were reachable — producing a burst of startup errors that looked like crashes. Worse, in a clustered deployment every replica would attempt leader-only work and then lose the Zookeeper/Redis lock race, leaving scheduling in an inconsistent state. The Framework3.0 migration (`#91850`) introduced the event model; Zookeeper was replaced by Eureka + a separate leader election.

## How to apply

- For any "run once per cluster at startup" work, prefer `@WaitForServices(..., requireLeader=true)` over `@PostConstruct`.
- Non-leader replicas must tolerate the gated method never firing.
- If a new upstream dependency is added, include it in `requiredServices` — do not assume it will be UP because your service is UP.
- Log the "waiting for services" state at INFO; otherwise long startup stalls look like hangs in production.

## Evidence

- `ServiceReadyListener` class and its `@WaitForServices` annotation usage.
- Commits: `f1ea99e` "Event-Driven 방식 적용", `d85bc1a` "Eureka 로직 추가(Zookeeper 제거)", `ff26f47` same theme.
