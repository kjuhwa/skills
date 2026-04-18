---

name: blue-green-deploy-data-simulation
description: Deterministic state-machine generator for blue-green cutover phases with realistic traffic drain and health-check dynamics
category: workflow
triggers:
  - blue green deploy data simulation
tags: [workflow, blue, green, deploy, data, simulation]
version: 1.0.0
---

# blue-green-deploy-data-simulation

Simulate a blue-green deployment as a finite state machine with phases: `idle` → `deploying-green` → `warming-green` → `smoke-testing` → `cutover` → `draining-blue` → `green-active` (and a `rollback` branch from any post-cutover phase back to `blue-active`). Drive each phase with a tick function that advances a shared clock and emits instance-level events; phase durations should be configurable with sensible defaults (warm-up 30–60s, smoke-test 15–30s, cutover 3–10s, drain 30–120s). Keep a single `activeColor` field plus a `trafficSplit` number in [0,1] — during cutover, interpolate `trafficSplit` with an ease-in-out curve rather than a linear ramp so the animation feels realistic, and derive each side's RPS as `totalRPS * split` (or `1-split`).

Generate per-instance health deterministically from a seeded RNG so the same simulation scenario replays identically: during `warming-green`, instances flip from `starting` → `healthy` at staggered intervals; during `smoke-testing`, inject a configurable failure probability (default 5%) on one instance to exercise the rollback path; during `draining-blue`, decay each blue instance's in-flight request count from its pre-cutover level to zero over the drain window. Emit both the aggregate state (for the router view) and a per-instance event log (for the timeline strip) from the same tick so visualizations stay in lockstep.

Expose scenario presets: `happy-path`, `smoke-test-failure-rollback`, `slow-drain` (long-lived websocket connections), `partial-warmup-failure` (1 of N green instances fails to become healthy), and `double-cutover` (rapid re-deploy). Each preset is a config object, not a hand-coded sequence, so the same tick engine produces all of them — this keeps the simulator honest and lets users toggle scenarios without reloading. Persist the seed and config in the URL so scenarios are shareable.
