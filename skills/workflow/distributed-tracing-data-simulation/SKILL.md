---
name: distributed-tracing-data-simulation
description: Workflow for generating realistic synthetic distributed trace data with proper parent-child span relationships, timing causality, and service dependency graphs.
category: workflow
triggers:
  - distributed tracing data simulation
tags:
  - auto-loop
version: 1.0.0
---

# distributed-tracing-data-simulation

Realistic trace simulation requires three layers: a **service dependency graph**, a **span tree generator**, and a **metrics synthesizer**. Start by defining a directed acyclic graph of services (e.g., `gateway → auth → user-api`, `gateway → order-api → payment → inventory`) with per-edge call probabilities and fan-out counts. Avoid random service selection—real traces follow deterministic call chains where `order-api` always calls `payment`, never `auth`. Generate the span tree by walking the dependency graph recursively: the root span (gateway) spawns child spans for each downstream call, each child inherits `traceId` from the parent and generates its own `spanId`, and timing follows `child.start = parent.start + networkLatency + queueDelay` with `child.end <= parent.end`. Use service-specific latency distributions (cache: 1-5ms, database: 10-80ms, external API: 50-300ms) rather than uniform random ranges.

Each span must carry explicit parent-child references (`parentSpanId`) to preserve causality. The flat array representation (`[node, ...children]`) used by simple implementations destroys hierarchy—store spans in a flat array but include `parentSpanId` so the tree can be reconstructed. For timing, model three components separately: **network latency** (1-15ms between services), **processing time** (service-specific distribution), and **queue wait** (0ms under normal load, spiking under backpressure). Child spans should be sequential with small gaps (`gap = random(1-5ms)`) for synchronous chains, or overlapping for parallel fan-out calls (e.g., gateway calling auth and order-api concurrently). Validate the invariant `child.start >= parent.start && child.end <= parent.end` after generation—silent truncation of children that exceed parent bounds produces traces that violate causality.

The metrics synthesizer generates aggregate statistics from the span tree: per-service RPS (count spans per service per second), per-service p50/p95/p99 latency (from duration distributions), per-edge call rate (count parent→child transitions), and error rates (inject failures at 1-5% probability on specific services). Seed the random generator for reproducibility—`Math.random()` produces different topologies on every page load, making bug reproduction impossible. Use a seeded PRNG (e.g., `mulberry32`) initialized from a trace-id hash so the same traceId always produces the same span tree. Ensure metric consistency: the sum of outbound edge rates from a node should not exceed that node's RPS, and error rates should propagate upstream (if payment fails, order-api's span should also show an error status).
