---
name: time-series-db-data-simulation
description: Strategies for generating realistic synthetic TSDB metric streams with seasonality, anomalies, and multi-resolution downsampling for interactive browser demos.
category: workflow
triggers:
  - time series db data simulation
tags:
  - auto-loop
version: 1.0.0
---

# time-series-db-data-simulation

Realistic TSDB simulation requires three signal components layered together: a **baseline with diurnal seasonality** (sine wave with 24h period), **gaussian noise** proportional to the baseline amplitude, and **injected anomalies** (spike, dropout, level-shift) at random intervals. The formula `value = baseline * (1 + 0.3 * sin(2π * hour/24)) + noise(σ=baseline*0.05) + anomaly()` produces convincing CPU/memory/request-rate curves. For the query playground, generate 5-10 named metrics (cpu_usage, mem_bytes, req_per_sec, disk_iops, net_tx_bytes) each with different baseline ranges and noise profiles. Timestamps should use millisecond-precision Unix epochs, and the generator should support both historical backfill (fill N hours of data at 10s intervals) and live streaming (push one point every `intervalMs`).

Retention-tier simulation models the compaction pipeline: raw points at 10s intervals are aggregated into 5-minute rollups (min/max/avg/count), then 1-hour, then 1-day. Each tier stores progressively fewer points but with richer aggregates. Simulate this by generating raw data first, then running a `downsample(points, bucketMs)` function that groups by `Math.floor(ts / bucketMs) * bucketMs` and emits the aggregate tuple. Introduce realistic imperfections: 2-3% of raw points arrive late (timestamp older than the current write cursor), 0.5% are duplicates, and one in every ~500 points carries a `NaN` value that the aggregator must handle.

The ingestion monitor simulation models write-path behavior: a Poisson-distributed arrival rate (λ = target writes/sec) with periodic bursts (3× rate for 10-30s windows simulating batch imports) and backpressure events where the accept rate drops to 10% for 5-15s. Track three counters — `accepted`, `rejected` (over capacity), and `pending` (in write-ahead buffer) — and expose them as a time series themselves, creating a meta-monitoring loop that exercises the same visualization code on its own telemetry.
