---
name: canary-release-data-simulation
description: Simulation patterns for canary traffic splitting, phased metric generation, fault injection, and rollback/promote state machines.
category: workflow
triggers:
  - canary release data simulation
tags:
  - auto-loop
version: 1.0.0
---

# canary-release-data-simulation

The traffic-shifter models canary routing as a probability gate: each spawned particle rolls `Math.random()*100 < canaryPct` to decide its lane, producing a natural Bernoulli-distributed traffic split that visually mirrors weighted load-balancer behavior. Particles carry `isCanary`, `targetY` (lane), and `speed` (jittered 2–4px/frame), creating organic flow without deterministic paths. The error rate is modeled as a piecewise function—zero below 60% canary traffic, then linearly increasing at `(canaryPct - 60) * 0.15`—simulating the real-world pattern where canary bugs only surface under load saturation. This split-dependent error model is far more realistic than random noise and teaches operators that "green at 10% does not mean green at 80%."

The rollback simulator implements a four-state machine: Idle → Canary Active → (Fault Injected) → Rolled Back or Promoted. The `sample()` function generates stable error at `0.5 + rand*1.5` (baseline noise) and canary error at `1 + rand*2` (slightly elevated), but when `faultActive` flips true the canary jumps to `12 + rand*10`—a 6× spike that visually breaches the red threshold line at 10%. Rollback zeroes canary error by setting `rolledBack=true`, and promote is gated: it checks `if(faultActive)` and refuses with an inline alert, enforcing the real-world rule that you cannot promote a canary with active anomalies. The 500ms sample interval with a 120-point sliding window gives a 60-second visible history—enough to see the fault spike, the decision point, and the recovery.

The dashboard simulation layers three data generators: a latency time series (stable at 45±15ms, canary at 48±20ms, shifted every 800ms), an error-budget ring (static percentage rendered as a `stroke-dasharray` arc), and an event log that prepends timestamped messages every 3 seconds from a rotating pool ("Health check OK", "Metrics nominal", "CPU 34%"). The timeline advances through five named stages (Created → 5% → 25% → 50% → 100% GA) with a `progress` index controlling fill state. Together these generators simulate the three information streams operators watch during a real canary rollout: latency drift, budget burn, and operational events.
