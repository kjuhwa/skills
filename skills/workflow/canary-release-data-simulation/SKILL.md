---
name: canary-release-data-simulation
description: Tick-based probabilistic generators for canary traffic ratios, error injection, latency degradation, and phased auto-promotion.
category: workflow
triggers:
  - canary release data simulation
tags:
  - auto-loop
version: 1.0.0
---

# canary-release-data-simulation

The simulation engine runs on a fixed-interval tick (1.5 s default) that drives three independent data streams. **Traffic ratio** is either user-controlled (slider bound to a 0–100 integer) or auto-promoted: starting at 5%, incrementing by a fixed step every K ticks (e.g., +5% every 10 ticks) until a ceiling (50%) is reached or an anomaly gate fires. Each tick spawns `ceil(ratio * batchSize)` canary requests and the remainder as stable requests, giving downstream charts a natural staircase shape during promotion.

**Error injection** uses a per-version probability: stable holds a near-zero baseline (0.5%), while canary carries a tunable fault rate (3–8%). On each spawned request a `Math.random() < errorRate` check flags it as failed. A second, phase-gated degradation layer kicks in after a configurable tick threshold (e.g., tick 60): it elevates canary latency from ~120 ms to ~150 ms and error rate from 1% to 3%, simulating a real regression surfacing under sustained load. This two-stage model lets dashboards exercise both "healthy canary" and "degrading canary" visual states without manual intervention.

**Promotion and rollback logic** ties the streams together. An auto-promoter watches a sliding window of the last W error-rate samples; if all stay below a threshold (e.g., 2%) it advances to the next traffic tier. Conversely, if any sample breaches a critical threshold (e.g., 5%), promotion halts and an event-log entry is emitted with timestamp, metric name, and breached value. A manual rollback action resets the traffic ratio to 0% canary and appends a rollback phase to the timeline with an operator-supplied reason, modeling the real-world circuit-breaker pattern used in progressive delivery pipelines.
