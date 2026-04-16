---
name: blue-green-deploy-data-simulation
description: Strategies for generating synthetic blue-green deployment events, traffic metrics, and state transitions for testing and demos.
category: workflow
triggers:
  - blue green deploy data simulation
tags:
  - auto-loop
version: 1.0.0
---

# blue-green-deploy-data-simulation

Simulating blue-green deployments requires three data generators running at different cadences. The **RPS generator** produces a continuous stream of requests-per-second values for each environment: the active environment emits `40 + Math.random() * 60` (realistic 40–100 RPS range) while the standby emits near-zero noise (`Math.random() * 5`). These feed a rolling buffer of 50 samples, shifted on each `requestAnimationFrame` tick, to produce smooth sparkline charts. During a cutover, both generators remain active but the fill-bar percentage determines which environment's traffic visually dominates — the transition runs as a `setInterval` incrementing 10% every 200ms, completing the full switch in 2 seconds.

The **traffic particle generator** spawns 3 particles every 100ms from the load-balancer origin. Each particle carries a `speed` of `0.008 + Math.random() * 0.012` (variable to avoid visual clumping) and a linear interpolation parameter `t` that advances each frame. Particles reaching `t >= 0.99` are counted toward their destination's req/s metric and filtered out. The blue/green split ratio is driven by a single percentage value, making it trivial to simulate canary ramps (1%→5%→25%→100%) or instant cutover (0%→100%). Latency values are simulated as `baseMs + Math.random() * jitterMs` per environment per second tick.

The **deployment event generator** produces timestamped records with fields: `env` (alternating blue/green by index), `version` (semver with random patch), `service` (rotating through a service registry like Auth, API Gateway, Payment), `status` (weighted random: 70% success, 15% rolled-back, 15% failed), `author`, `duration` (5–60s uniform), and `date` (spaced 6 hours apart via `idx * 3600000 * 6` offset from now). Health-check results are derived from status — failed deployments show partial pass rates (e.g., 3/5), while success and rolled-back show 5/5. Commit hashes are generated via `Math.random().toString(36).slice(2,10)`. This three-layer simulation stack lets you populate dashboards, test alerting thresholds, and demo cutover workflows without a real infrastructure backend.
