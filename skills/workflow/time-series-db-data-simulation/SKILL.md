---

name: time-series-db-data-simulation
description: Generate synthetic TSDB workloads using layered signal components (trend + seasonality + noise + anomalies) with back-dated timestamps.
category: workflow
triggers:
  - time series db data simulation
tags: [workflow, time, series, data, simulation, synthetic]
version: 1.0.0
---

# time-series-db-data-simulation

TSDB simulators (ingest-simulator, query-repl fixtures) should generate data as a **superposition of four independent signal layers**: (1) a linear or exponential trend baseline, (2) one or more seasonal sines (daily=86400s, weekly=604800s, business-hours square wave), (3) Gaussian noise scaled to ~2–5% of the signal amplitude, and (4) injected anomalies — spikes, level shifts, and missing-data gaps — at Poisson-distributed intervals. Each series should expose its parameters (trend slope, seasonal amplitudes, noise σ, anomaly rate) so tests can assert detection behavior against a known ground truth. Ingestion rate itself is a tunable knob, typically parameterized as points-per-series-per-second × series-count, because TSDB write amplification scales non-linearly past ~100k points/sec/node.

Always **back-date** synthetic data so the series ends at `now() - 30s` rather than streaming to `now()` — TSDB query engines often treat the most recent bucket as partial and round down, so tests that assert "most recent value" will flap if the simulator writes at wall-clock present. Timestamps should be generated at a fixed cadence (e.g., every 10s exactly) with optional jitter ±1s to mimic real agent clock skew; never use `Date.now()` inside the loop because batched writes will cluster at the batch-flush instant, producing artifactual gaps at the end of every batch.

Drive simulation from a **replayable seed**: store the RNG seed + start timestamp + parameters in the simulation manifest, so the same "scenario" (e.g., "CPU spike at T+600s across 3 of 10 hosts") can be re-run deterministically for regression tests. The REPL-style tools should ship a handful of named scenarios (`steady_state`, `slow_drift`, `flash_crowd`, `agent_flapping`) rather than exposing raw parameter dials — users don't know what σ=0.3 looks like, but they know what "flash crowd" means.
