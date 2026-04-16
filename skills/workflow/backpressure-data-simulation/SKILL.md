---
name: backpressure-data-simulation
description: Deterministic simulation loop for generating producer/consumer/buffer state with configurable pressure strategies
category: workflow
triggers:
  - backpressure data simulation
tags:
  - auto-loop
version: 1.0.0
---

# backpressure-data-simulation

Model the simulation as a fixed-tick loop (e.g., 60fps or 100ms steps) with three mutable state objects: `producer { rate, pending, emitted }`, `buffer { items[], capacity, highWatermark, lowWatermark }`, and `consumer { rate, consumed, stalled }`. On each tick, compute `itemsToProduce = producer.rate * dt` and `itemsToConsume = consumer.rate * dt` using fractional accumulators so non-integer rates remain accurate across ticks. Apply the selected strategy when `buffer.items.length + itemsToProduce > capacity`: **block** (reduce producer emission and increment `producer.stalled`), **drop-newest** (discard incoming), **drop-oldest** (shift from head), or **sample** (keep every Nth). Each path must emit a discrete event record so the visualization and metrics agree.

Seed the producer rate with a configurable profile: constant, burst (square wave), sinusoidal, or Poisson-random with a fixed seed for reproducibility. The consumer should support the same profiles plus a "slow-start then recover" mode that exposes classic backpressure scenarios. Track rolling windows (last 1s, 5s, 30s) for in-rate, out-rate, drop-rate, and buffer-depth so the UI can show stable averages without per-frame jitter. Always expose a deterministic seed and a pause/step control—debugging a pressure bug frame-by-frame is the only way to verify strategy correctness.

Separate **simulation state** from **render state**: the sim advances in logical time and emits an immutable snapshot per tick; the renderer interpolates between snapshots. This decoupling lets you run the sim at 10Hz while rendering at 60fps, and makes it trivial to speed up or slow down the clock without changing physics. Export the full event log (produced, enqueued, dequeued, dropped, stalled) as replayable JSON for regression testing.
