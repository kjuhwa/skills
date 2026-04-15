---
name: wait-for-services-eureka-startup-init
title: Gate startup initialization on dependent-service readiness via @WaitForServices
description: Defer schema/index/data bootstrap until named services report ready in discovery, with bounded exponential backoff and leader election
type: knowledge
category: arch
confidence: high
source:
  kind: project
  ref: lucida-topology@8729ca3
tags: [startup, service-discovery, eureka, zookeeper, leader-election, event-driven]
---

# Gate startup initialization on dependent-service readiness

## Fact
On boot, the service must (a) create Mongo collection indices per tenant and (b) publish a
resource-type definition to Kafka. Both steps require other services (`account`, `meta`, `cm`)
to already be reachable. Instead of retrying inside each init method, the project uses a
shared-library annotation `@WaitForServices` on an `@EventListener` method. The event
(`ServicesReadyLeaderEvent`) only fires after discovery confirms the named services are healthy
and this instance has won leader election — init code runs exactly once cluster-wide.

## Shape
- Init logic is in a method annotated with both `@EventListener` and `@WaitForServices(...)`.
- `@WaitForServices` parameters: `requiredServices` (AND-join), `requireLeader`, `maxRetries`,
  `initialDelayMs` / `maxDelayMs` (exponential backoff), `checkHealth`, `checkReadiness`,
  `healthCheckTimeoutMs`, `markAsInitialized`.
- With `requireLeader = true`, set `markAsInitialized = false` — otherwise non-leader instances
  skip a later init that they should still run locally.
- The event is dispatched by the shared discovery module after all gates pass; a missed
  dependency fails the instance rather than booting it half-initialized.

## Why chosen (over Spring `ApplicationRunner` + manual retry)
- Cross-cutting: every service in the fleet uses the same gate, so ops can reason about boot
  ordering uniformly.
- Leader election prevents duplicated side effects (index creation, topic publish) when N
  replicas start simultaneously.
- Failure mode is explicit: `maxRetries` exhausted → event never fires → service fails readiness
  probe → orchestrator restarts it. No silent "booted but broken" state.

## Counter / Caveats
- `requireLeader = true` + `markAsInitialized = false` is a specific combination; getting it
  wrong causes replicas to race or to skip work. Always review this pairing in PRs.
- Long `maxRetries * maxDelayMs` can exceed the orchestrator's readiness timeout. Tune both
  together.
- The event listener is decoupled from startup logs; when it *doesn't* fire, it can look like
  the service is idle. Always log entry and exit of the gated method.

## Evidence
- `src/main/java/com/nkia/lucida/topology/service/InitializeServiceImpl.java#applicationStartedEventListener`.
- `CLAUDE.md` — "Startup Initialization" section.
- Commit `f656936`: "어플리케이션 초기화 작업 개선. Event-Driven 방식 적용".
