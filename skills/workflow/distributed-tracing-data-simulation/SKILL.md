---

name: distributed-tracing-data-simulation
description: Generating realistic synthetic trace data with parent-child causality, latency distributions, and injected faults
category: workflow
triggers:
  - distributed tracing data simulation
tags: [workflow, distributed, tracing, data, simulation, synthetic]
version: 1.0.0
---

# distributed-tracing-data-simulation

Real trace data is hard to obtain for demos and tests, but naive random generators produce unusable output — uniform latency distributions, flat call trees, no error correlation. A realistic simulator must respect three invariants: (1) **causality** — child span `startTime >= parent.startTime` and child `endTime <= parent.endTime`; (2) **service topology** — calls flow along a predefined DAG (e.g., `gateway → auth → orders → {inventory, payments} → db`), not arbitrary service pairs; (3) **latency realism** — per-operation latencies sampled from log-normal or Pareto distributions, not uniform, so p99/p50 ratios resemble production (typically 5×–20×).

Structure the generator as a recursive tree walk. Start from a root span for the entry service, sample its total duration from the operation's distribution, then for each downstream call in the topology, recursively generate a child span whose startTime is offset by `parent.startTime + sequentialWork` and whose duration is bounded by the parent's remaining budget. Emit spans in a flat array keyed by `spanId` with `parentSpanId` pointers — this matches the OpenTelemetry wire format and lets visualizations consume production and synthetic data identically.

Inject faults deterministically via a seeded RNG so scenarios reproduce: a configurable `errorRate` per operation, a `slowTailProbability` that multiplies duration by 10×–100× for a small fraction of spans, and optional `cascadeFailure` that propagates errors up the tree when a child fails. Expose the seed and topology config in the UI so users can A/B compare "healthy" vs "degraded" traces side by side — this is what makes the demo teach the visualization, not just decorate it.
