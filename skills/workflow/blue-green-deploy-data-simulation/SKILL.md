---
name: blue-green-deploy-data-simulation
description: Strategies for generating realistic blue-green deployment data — RPS curves, traffic split probabilities, and deploy event histories with weighted outcomes.
category: workflow
triggers:
  - blue green deploy data simulation
tags:
  - auto-loop
version: 1.0.0
---

# blue-green-deploy-data-simulation

The simulator generates synthetic RPS data using `40 + Math.random() * 60` for the active environment and `Math.random() * 5` for the idle standby, creating a realistic visual contrast between a serving environment (~40-100 RPS) and a near-zero idle one. Data is maintained as a fixed-length sliding window (50 points) using `push/shift`, which provides a moving chart without unbounded memory growth. During a deploy, the traffic percentage animates in 10% increments on a 200ms interval, simulating a gradual traffic shift rather than an instant cutover — this mirrors real load-balancer weight adjustments. A 1500ms delay before the traffic shift begins simulates the health-check verification window.

The traffic flow app models individual requests as particles with randomized speeds (`0.008 + Math.random() * 0.012` per frame as a `t` interpolation factor), producing a natural spread of in-flight request durations. The slider value directly sets the spawn probability: `Math.random() * 100 < bluePct` determines routing per-particle, which statistically converges to the configured split ratio. Latency metrics are simulated as `12 + Math.random() * 8` for blue and `10 + Math.random() * 10` for green — the slight offset and different variance ranges simulate version-specific performance characteristics without requiring a real backend.

The timeline app generates deploy events with a weighted status distribution: 70% success, 15% rolled-back, 15% failed (`r < 0.7 ? 'success' : r < 0.85 ? 'rolled-back' : 'failed'`). Deploys alternate between blue and green environments via modulo indexing (`idx % 2`), services rotate through a fixed list, and duration is randomized as `5 + Math.random() * 55` seconds. Timestamps are spaced 6 hours apart counting backward from `Date.now()`, producing a plausible deploy cadence. Commit hashes are faked with `Math.random().toString(36).slice(2, 10)`. This weighted-random approach produces realistic-looking histories where most deploys succeed but failures and rollbacks appear often enough to exercise all UI states.
