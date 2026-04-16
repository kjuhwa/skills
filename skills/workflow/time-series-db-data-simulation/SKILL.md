---
name: time-series-db-data-simulation
description: Synthetic TSDB data generation using sinusoidal base curves with random noise, multi-host tag fanout, and configurable retention tier modeling.
category: workflow
triggers:
  - time series db data simulation
tags:
  - auto-loop
version: 1.0.0
---

# time-series-db-data-simulation

Generating realistic TSDB sample data requires a domain-aware value generator rather than plain `Math.random()`. The pattern across all three apps uses a sinusoidal base signal combined with additive noise: `baseOffset + Math.sin(timestamp / period) * amplitude + Math.random() * jitter`. CPU metrics center around 40-50% with ±15% sine swing and ±30% random spread, temperature sensors use a 20°C baseline with ±5° swing, request counts use 800 req/s baseline with ±400 sine modulation, and latency uses 12ms base with ±10ms oscillation. This produces data that looks like real infrastructure telemetry — periodic patterns (diurnal cycles, garbage collection) overlaid with noise — rather than flat random scatter that immediately signals "fake data" to users.

Tag simulation requires a host pool (`['web-01', 'web-02', 'db-primary', 'cache-01']`) with random selection per point to simulate multi-source ingestion. For query sandbox scenarios, data is generated in fixed-interval batches (e.g., 12 points at 5-minute intervals spanning the last hour) to simulate the output of a `GROUP BY time(5m)` aggregation query. The query parser uses a regex `/(avg|max|min|sum|count)\((\w+)\)/i` to extract the aggregate function and metric name from InfluxQL/PromQL-style syntax, then routes to the appropriate generator. Execution timing is measured via `performance.now()` to display realistic query latency.

Retention tier simulation models the storage-granularity tradeoff using a resolution multiplier table (`{'1s': 1, '5m': 1/300, '1h': 1/3600, '1d': 1/86400}`) applied against a base rate of 86,400 points per day (1 point/second). Each tier defines a name, resolution, retention duration in days, and display color. Storage is estimated as `basePointsPerDay * resolutionMultiplier * days * bytesPerPoint / 1e6` in GB. Tiers are user-configurable with add/remove/edit controls, and a timeline visualization renders horizontal bars scaled proportionally to retention duration, giving operators an immediate visual sense of how raw-vs-downsampled data coverage overlaps across time horizons.
