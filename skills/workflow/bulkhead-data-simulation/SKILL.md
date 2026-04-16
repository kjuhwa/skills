---
name: bulkhead-data-simulation
description: Tick-based probabilistic simulation patterns for modeling bulkhead breach flooding, thread pool request load, and partition stress testing.
category: workflow
triggers:
  - bulkhead data simulation
tags:
  - auto-loop
version: 1.0.0
---

# bulkhead-data-simulation

The physical breach simulation uses a `requestAnimationFrame` loop with a fixed fill rate (`level += 1.2` per frame, capped at `waterMax`). Each compartment is an independent state object `{x, breached, level}` — breaching is triggered by click-hit-testing against compartment column bounds, and flooding is strictly local: a breached compartment's water level rises while sealed neighbors remain at zero. This per-compartment isolation is the core bulkhead invariant. The update function counts breached compartments each frame and reports `N breached — M still sealed`, giving real-time feedback on containment effectiveness. The key reusable pattern: model each partition as an independent state machine (sealed → breached → flooding), advance only breached partitions per tick, and aggregate health from individual states.

The software thread-pool simulation runs on a `setInterval(tick, 700ms)` clock. Each tick, every service independently rolls two dice: a 40% chance to receive a new request and a 35% chance to complete an existing one. If `active < max`, the request is accepted and the active count increments; if the pool is full, the request is rejected and the rejected counter increments. This produces realistic bursty load with organic pool saturation and draining. The rejection event (`REJECTED — bulkhead full`) is the critical bulkhead behavior: overload in one service's pool cannot steal capacity from another service's pool. Per-service counters (active, rejected, total) provide the metrics needed for utilization bars and rejection-rate analysis.

The structural stress test is a single-shot computation rather than a continuous simulation. It collects section widths from sorted wall positions, computes the ideal width as `totalSpan / (wallCount + 1)`, then calculates mean absolute deviation from ideal. The score `max(0, 100 - variance/2)` penalizes uneven partitioning — a hull with one 400-unit section and five 40-unit sections scores poorly because the large section is a structural weak point (analogous to an oversized thread pool that concentrates risk). Sections exceeding 1.5× ideal width are flagged individually. This variance-based scoring is reusable for any resource-partitioning optimizer.
