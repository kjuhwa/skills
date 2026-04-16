---
name: health-check-data-simulation
description: Realistic health-check data generation using probability bands, random-walk latency, and rolling history buffers
category: workflow
triggers:
  - health check data simulation
tags:
  - auto-loop
version: 1.0.0
---

# health-check-data-simulation

All three health-check apps simulate live data without a backend using a layered strategy. The Matrix app uses probability-band generation: each tick rolls a random number and maps it to status thresholds (75% healthy, 17% degraded, 8% down), producing realistic uptime ratios where most services are green but occasional degradation clusters emerge naturally. The Pulse app uses random-walk latency simulation where each service's latency shifts by `±10ms` per tick (`Math.random() - 0.5) * 20`), clamped to a minimum of 1ms, creating believable jitter patterns. Down services are hardcoded to 0ms/500ms latency to represent unreachable endpoints. The Orbit app assigns static health percentages (0-100) per node and uses them to derive visual properties (size, opacity, color thresholds), simulating a point-in-time snapshot rather than a live stream.

The rolling-history buffer pattern in Pulse (`history[name].push(value); history[name].shift()`) maintains a fixed-length window (60 data points) that feeds the sparkline canvas, ensuring constant memory usage regardless of uptime. The Matrix similarly shifts its 24-slot array left and appends a new value, sliding the time window forward. Both use `setInterval` (1s for Pulse, 3s for Matrix) to drive updates, while Orbit uses `requestAnimationFrame` for smooth 60fps orbital animation. This creates a natural tiering: fast intervals for latency-sensitive views, slower intervals for status-board views, and animation frames for continuous motion.

To reuse: seed each service with a base profile (typical latency range, failure probability), generate per-tick deltas using random walk for metrics and probability bands for categorical status, and store history in a fixed-length ring buffer. Use `setInterval` for dashboard-rate updates (1-5s) and `requestAnimationFrame` only when continuous visual animation is needed. Vary failure probability per service to create realistic heterogeneity — don't make all services equally likely to fail.
