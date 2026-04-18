---

name: load-balancer-data-simulation
description: Deterministic seeded traffic generator for exercising load balancer algorithms with reproducible scenarios
category: workflow
triggers:
  - load balancer data simulation
tags: [workflow, load, balancer, data, simulation]
version: 1.0.0
---

# load-balancer-data-simulation

Drive the simulation from a seeded PRNG (mulberry32 or similar) so scenario replays are bit-identical — this is non-negotiable for algorithm-showdown style apps where users compare round-robin vs least-connections vs weighted vs consistent-hash on the same workload. Model each backend as `{id, weight, capacity, baseLatencyMs, jitterMs, healthy, activeConnections, totalServed}` and each request as `{id, arrivalTick, clientKey, sizeBytes, serviceTimeMs}`. Generate arrivals via a Poisson process with a configurable λ and optionally overlay bursts (a step function multiplier) and hot keys (80/20 client skew) so users can see algorithms diverge under skewed traffic — uniform workloads make all algorithms look identical and are the #1 reason these demos feel boring.

Expose scenario presets as named fixtures: "uniform baseline", "hot-key skew" (exposes weakness of simple hash), "node-failure mid-run" (exposes rebalance cost of consistent hash vs modulo), "weighted heterogeneous pool" (exposes why round-robin is wrong for mixed hardware), and "thundering herd" (exposes least-connections advantage). Each fixture should be a pure function `(seed, durationTicks) => {backends, requestStream, events}` where `events` is a timeline of injected failures/scale-outs. Store fixtures as TypeScript constants, not JSON — users need to read them to understand what's being tested.

Compute three metrics continuously and surface them: (1) load imbalance as the coefficient of variation of per-backend connection counts, (2) p50/p95/p99 request latency from arrival to completion, and (3) rebalance churn — the fraction of active sessions that would be re-homed if membership changed this tick. Metric 3 is what sells consistent hashing; without it, consistent-hash-ring looks like a fancier round-robin.
