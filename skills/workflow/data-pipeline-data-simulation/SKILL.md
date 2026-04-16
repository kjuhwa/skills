---
name: data-pipeline-data-simulation
description: Simulation strategies for generating realistic pipeline telemetry — particle spawning, DAG state machines, and correlated random-walk time-series.
category: workflow
triggers:
  - data pipeline data simulation
tags:
  - auto-loop
version: 1.0.0
---

# data-pipeline-data-simulation

Pipeline simulations serve three purposes: demo without infrastructure, operator training, and UI stress-testing. The three canonical simulation engines map to the three visualization archetypes. **Probabilistic particle spawning** drives flow monitors: each animation frame rolls `Math.random() < spawnRate` (0.3 is a good default) to inject a new particle, with error injection as a separate roll (`Math.random() < errorRate`). Particles carry speed jitter (`1.2 + Math.random()`) and advance through stage boundaries. The critical detail is the reaping policy — particles must be removed when they exit the final stage or when errors cause them to fade (`alpha < 0.01`), and a hard pool cap (e.g., 500 particles) must be enforced to prevent unbounded growth under sustained error rates. **DAG state machines** drive topology editors: each node holds a state enum (idle → running → done → error) that can be toggled by click or advanced by a "run pipeline" command that walks edges in insertion order. The simulation is inherently static — the DAG structure doesn't change at runtime — so the state transitions are the interesting part.

**Correlated random-walk generators** drive throughput dashboards: each pipeline maintains a 30-point history buffer, and each tick appends `Math.max(floor, lastValue + Math.floor(Math.random() * range - range/2))` to produce a Brownian-motion time series. The key realism requirement is **metric correlation**: throughput, error rate, and backpressure must co-move. When backpressure exceeds a threshold, nudge error rate upward and throughput downward — independent `Math.random()` per metric produces physically impossible states (0% errors with 40% backpressure) that teach operators the wrong intuition. Use the shift/push pattern on fixed-size arrays to maintain the rolling window without reallocation. For all three engines, expose simulation parameters (spawn rate, error rate, tick interval, walk range) as toolbar controls so users can explore edge cases — extreme values are where bugs hide.
