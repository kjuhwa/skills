---
name: load-balancer-data-simulation
description: Deterministic request-stream and backend-behavior simulation for load balancer demos
category: workflow
triggers:
  - load balancer data simulation
tags:
  - auto-loop
version: 1.0.0
---

# load-balancer-data-simulation

Simulated load balancer data must be driven by a seeded PRNG so the same scenario replays identically — critical for comparing algorithms side-by-side. Model three independent streams: (1) a request generator with configurable arrival distribution (Poisson for steady state, bursty Pareto for flash-crowd demos, diurnal sine for realistic traffic), each request carrying a client-id (for hash-based algorithms), payload size, and expected service time; (2) a backend pool where each server has capacity, baseline latency, jitter, and a failure script (e.g. "server-3 CPU spikes at t=30s, fails health check at t=45s, recovers at t=70s"); (3) a health-check probe stream firing on its own interval independent of request traffic.

Drive dispatching through a pluggable strategy interface (`pickBackend(request, pool, state) → backend`) so round-robin, least-connections, weighted-random, consistent-hash-ring, least-response-time, and IP-hash all share the same simulation harness. Track per-backend active-connection counts by incrementing on dispatch and decrementing on a scheduled completion event — don't approximate with rolling averages, because the whole point of the demo is to show how least-connections reacts to in-flight state. For consistent-hash specifically, pre-build the ring with 100–200 virtual nodes per physical backend and cache the sorted hash array; on node add/remove, only the affected arc needs recomputation, which matches real-world behavior and makes the "only 1/N keys move" claim observable.

Surface three derived metrics continuously: p50/p95/p99 latency per backend, connection-count variance across the pool (the load-balance quality score), and request-drop rate under capacity saturation. These three numbers, updated every tick, let viewers watch algorithms diverge: weighted round-robin keeps variance low but p99 high when a weighted backend is slow; least-connections minimizes variance but thrashes under equal backends; consistent-hash trades variance for cache-locality wins that this simulation should expose by tagging a fraction of requests as "cache-hit if routed to previous backend."
