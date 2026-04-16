---
name: chaos-engineering-implementation-pitfall
description: Common failure modes when building chaos experiment tooling — propagation fidelity, coverage blind spots, and misleading metrics.
category: pitfall
tags:
  - chaos
  - auto-loop
---

# chaos-engineering-implementation-pitfall

The blast-radius simulator reveals a critical pitfall: using uniform random probability (Math.random() < 0.6) at every hop treats all services as equally fragile, which masks the real risk topology. In production, a stateless API gateway degrades very differently from a stateful payment service. If your simulation doesn't weight failure probability by service characteristics — retry policies, circuit breaker configuration, replication factor, data durability — the blast radius visualization will systematically underestimate damage to stateful services and overestimate damage to stateless ones. Teams that rely on uniform-probability models during gameday planning will allocate hardening effort to the wrong services. The fix is to attach a fragility coefficient to each node derived from real SLO data or architectural properties.

The resilience matrix exposes a coverage gap problem: with a 40% untested ratio and purely random score assignment, the matrix can show "all green" while critical paths remain untested. The current toggle-to-test interaction (click cell → randomly assign score) simulates running an experiment but provides no feedback about whether the test actually exercised the failure mode meaningfully. In real implementations, teams fall into the trap of marking cells as "tested" after a single shallow run — killing one pod once and seeing it recover doesn't prove resilience under sustained load. The matrix should track test depth (number of runs, duration, concurrent load level) alongside the pass/fail score, and flag cells where a single superficial run produced a green score as "low confidence."

The gameday board's error-rate chart uses a simple step-function regime change (flat → elevated at injection point), but real chaos experiments produce much more complex temporal signatures — initial spike, partial recovery, secondary cascade, eventual stabilization. A simplified sparkline can give operators false confidence that they understand the failure dynamics when the actual behavior includes delayed secondary effects that only appear minutes after the initial injection. Additionally, the 3-second polling interval for experiment status (setInterval(tick, 3000)) with a 5% random completion probability means experiments resolve in a time distribution disconnected from their actual blast radius. Production tooling must tie experiment lifecycle to real health-check signals, not synthetic timers, or operators will learn to distrust the board and revert to manual kubectl-and-Grafana workflows.
