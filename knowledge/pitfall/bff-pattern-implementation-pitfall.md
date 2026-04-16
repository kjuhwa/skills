---
name: bff-pattern-implementation-pitfall
description: BFFs silently become distributed monoliths when teams share one BFF across clients or let it accumulate business logic
category: pitfall
tags:
  - bff
  - auto-loop
---

# bff-pattern-implementation-pitfall

The most common failure is collapsing multiple BFFs into "one BFF to rule them all" to avoid code duplication. The moment a single BFF serves web, mobile, and IoT, its response shape has to satisfy the union of all client needs, which defeats the entire point — you're back to an API gateway with a fat generic payload. The rule is: one BFF per client experience, owned by the team that owns that client. Duplication across BFFs is a feature, not a bug, because it lets each client evolve independently without cross-team coordination. If you find yourself adding a `?client=mobile` query flag to branch logic inside a shared BFF, you've already lost.

The second pitfall is business logic creep. BFFs are supposed to be thin orchestration + projection layers, but teams gradually push validation, pricing rules, entitlement checks, and even persistence into them because "the BFF already has the data." Once that happens the BFF becomes a second source of truth that drifts from the backing services, and bugs show up as inconsistencies between the mobile app and an internal admin tool calling the same backend directly. Enforce a hard rule: BFFs may aggregate, project, reshape, and cache — never compute authoritative business state. Anything stateful or rules-based belongs behind a backend service.

The third, most operationally painful pitfall is tail latency coupling. Because a BFF waits for the slowest parallel backend call, adding one more fan-out target silently raises p99 for every request, even when that new backend is "fast on average." Teams discover this only after adding a 5th or 6th backend call and watching p99 double. Mitigations that actually work: (1) mark non-critical backends as optional with a hedged timeout shorter than the SLO, returning a partial response if they miss, (2) budget a total BFF time slice and cancel in-flight backend calls when it's exhausted, (3) monitor per-backend contribution to tail latency, not just aggregate BFF latency, so you can see which dependency is eating the budget.
