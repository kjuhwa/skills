---
name: blue-green-deploy-data-simulation
description: Generate realistic blue-green deployment telemetry including version skew, traffic weights, and cutover transitions
category: workflow
triggers:
  - blue green deploy data simulation
tags:
  - auto-loop
version: 1.0.0
---

# blue-green-deploy-data-simulation

Simulate blue-green deployment data as two parallel time-series streams sharing a common timeline, with each stack producing independent metrics (request-rate, p50/p95 latency, error-rate, healthy-instance-count, version-hash). Seed blue as the stable production baseline (v1.4.2, 100% traffic, error-rate ~0.1%, latency ~80ms) and green as the newly deployed candidate (v1.5.0, 0% traffic initially, warming up with slightly elevated latency for the first 30-60 seconds to mimic JIT warmup and cache priming).

Drive the simulation through discrete phases with configurable durations: `staging` (green boots, health checks pending), `canary` (5-10% weight, watch error-rate), `ramp` (stepped weights 25→50→75), `cutover` (100% green), `drain` (blue still up but zero traffic for ~5min rollback window), `decommission` (blue torn down). Traffic weight should be an explicit field summing to 1.0 between the two stacks; derive per-stack request-rate from total-rps × weight. Inject realistic failure modes: green error-spike during canary (triggers auto-rollback), latency-regression at 50% weight, or a slow-drain scenario where in-flight requests to blue complete after cutover.

Timestamps should advance on a fixed tick (1s or 5s) and every record must carry `stack: "blue" | "green"`, `phase`, `weight`, and `version` so downstream visualizations can filter and color consistently.
