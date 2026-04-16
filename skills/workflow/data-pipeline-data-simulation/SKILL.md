---
name: data-pipeline-data-simulation
description: Strategies for generating synthetic pipeline telemetry — record flow, stage latencies, failure injection, and backpressure signals.
category: workflow
triggers:
  - data pipeline data simulation
tags:
  - auto-loop
version: 1.0.0
---

# data-pipeline-data-simulation

Pipeline flow simulation uses a probabilistic spawn-and-advance model. Records are spawned at a configurable rate (e.g., 30% chance per animation frame) and advance through an ordered stage array with easing (`target - current) * 0.04`). Each record carries a `failAt` index drawn at spawn time — with a ~12% base failure probability uniformly distributed across stages — allowing the simulation to produce realistic failure clustering at expensive stages like Transform or Enrich. Dead records are retained briefly for visual fade-out, then garbage-collected by a combined `dead && elapsed > threshold` filter. This spawn-rate + fail-at-stage model is the minimal parameterization that still produces visually convincing pipeline behavior; adding per-stage failure rates or retry semantics is the natural next extension.

Throughput simulation maintains a fixed-length sliding window (60 samples) of events-per-second values generated as `baseline + random * amplitude` (e.g., 200 ± 90 evt/s). Stage latencies are modeled as bounded random walks: each tick perturbs the current value by ±4ms, clamped to a [5, 110] ms range, which produces the gradual drift pattern operators see in real pipelines. Error rate and backpressure are independent uniform random samples per tick (0–2.5% and 0–40% respectively). This decoupled-metric approach is intentional — in production pipelines, backpressure and error rate are loosely correlated at best, so simulating them independently avoids teaching users a false causal relationship.

For DAG-level simulation the "Run Pipeline" model propagates activation edge-by-edge at a fixed interval (400ms per hop), which approximates topological-order execution. The edge list `[[0,1],[0,2],[1,3],[2,3],[3,4]]` encodes a fork-join diamond — the most common pipeline shape after a linear chain. Reusing this activation-sweep pattern with variable per-edge delays (proportional to simulated stage cost) would produce a more realistic execution timeline without changing the underlying propagation model.
