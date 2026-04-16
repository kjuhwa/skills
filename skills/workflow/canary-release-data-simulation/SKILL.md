---
name: canary-release-data-simulation
description: Deterministic synthetic generator for canary traffic, SLO metrics, and bake-time gate evaluations
category: workflow
triggers:
  - canary release data simulation
tags:
  - auto-loop
version: 1.0.0
---

# canary-release-data-simulation

To simulate canary-release behavior, drive the clock with a fixed-step tick (e.g., 100ms of wall = 1s of simulated time) and parameterize a release plan as a list of `{weight, bakeSeconds, gates[]}` stages. On every tick, generate N synthetic requests, then roll a Bernoulli weighted split across stable vs canary lanes using the current stage weight. For each request, sample latency from a log-normal distribution per version (canary uses a slightly shifted mean to model the "new build" effect) and sample success/failure from a Bernoulli with a version-specific error rate. Seed the RNG so demos and tests replay identically.

Maintain per-version rolling windows (1-min, 5-min) over success count, error count, and latency quantiles. At the end of each stage's bake period, evaluate gate predicates against the rolling windows — `errorRateDelta < threshold`, `p99LatencyDelta < threshold`, `minRequestCount > N`. Emit a `GateResult` event per gate so the UI can animate pass/fail, and advance or roll back the stage pointer accordingly. Expose "inject chaos" hooks (bump canary error rate, add latency spike) so operators can rehearse failure modes.

Keep the generator pure and framework-free: inputs are `(releasePlan, chaosProfile, seed)`, output is a stream of `TickEvent | RequestEvent | GateResult | StageTransition`. The UI subscribes and renders; tests assert on the event sequence. This separation lets the same simulator power the timeline app, the shifter app, and the health app without duplicating traffic-generation logic.
