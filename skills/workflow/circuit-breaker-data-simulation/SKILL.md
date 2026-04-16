---
name: circuit-breaker-data-simulation
description: Client-side circuit breaker state machine simulation with configurable failure injection, cooldown timers, and multi-service random tick engines.
category: workflow
triggers:
  - circuit breaker data simulation
tags:
  - auto-loop
version: 1.0.0
---

# circuit-breaker-data-simulation

All three apps implement the same core state machine: a `state` variable cycling through `CLOSED → OPEN → HALF_OPEN → CLOSED`. In CLOSED, each failure increments a counter; when `failures >= threshold`, the breaker transitions to OPEN and starts a cooldown. In OPEN, requests are blocked (logged but not processed). After the cooldown expires, the breaker moves to HALF_OPEN, where the next success resets failures and transitions back to CLOSED, while any failure immediately re-trips to OPEN. The single-breaker visualizer uses `setTimeout` for the cooldown (real milliseconds), while the dashboard and simulator use tick-based countdown (`cooldown--` per interval), which is simpler and avoids timer cleanup issues. The threshold is either a fixed constant (e.g., `THRESHOLD=5`) or configurable via range sliders parsed at each tick with `cfg()`.

The multi-service dashboard simulates N independent breakers in a single `setInterval(tick, 500)` loop. Each service card holds its own `state`, `failures`, `threshold` (randomized 3-7), and `cooldown` counter. Failure injection uses `Math.random() < probability`, with a lower probability (0.02) when OPEN to simulate rare leak-through, and a normal rate (0.12) when CLOSED. Half-open recovery is probabilistic (`Math.random() > 0.5` on a non-failure tick), modeling the real-world uncertainty of probe requests. Throughput (`rps`) is simulated as a random range that drops dramatically when OPEN (0-5 vs. 40-120), feeding the sparkline history buffer. This creates realistic-looking traffic patterns without any real backend.

The interactive simulator adds user-controlled parameters: a failure-rate slider (0-100%) replaces the fixed probability, a threshold slider (1-10) controls trip sensitivity, and a timeout slider (1-10 ticks) governs cooldown duration. The simulation loop runs on `setInterval(simulate, 800)` and reads slider values fresh each tick via `cfg()`, enabling live parameter tuning without restart. The failure meter provides a secondary data channel, computing `(failures/threshold)*100` as a percentage width, which gives users a predictive signal of how close the breaker is to tripping before it actually does.
