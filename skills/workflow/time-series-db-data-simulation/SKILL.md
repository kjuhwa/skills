---
name: time-series-db-data-simulation
description: Generate realistic time-series sample streams with seasonality, trend, noise, and injected anomalies for TSDB demos
category: workflow
triggers:
  - time series db data simulation
tags:
  - auto-loop
version: 1.0.0
---

# time-series-db-data-simulation

Realistic TSDB simulation requires a composable signal generator: `value(t) = baseline + trend(t) + seasonal(t) + noise(t) + anomaly(t)`. Baseline is a constant per-series, trend is a slow linear or logistic drift, seasonal combines daily (period=86400s) and weekly (period=604800s) sine waves with different amplitudes, and noise is gaussian scaled to ~2-5% of baseline. Drive the clock with a simulated `nowTs` that advances in fixed ticks (e.g., 15s per frame at 60fps = 15min/sec wall time) rather than real `Date.now()` — this lets retention policies of hours/days play out in seconds.

For multi-series workloads, model cardinality explicitly: generate N series with label sets like `{host: "h-001..h-N", region: "us-east|us-west|eu", service: "api|db|cache"}` and vary the baseline per label combination. This reproduces the high-cardinality stress that real TSDBs face. Store samples in a ring buffer keyed by `(seriesId, bucketStart)` rather than a flat array — it matches the head-chunk model and makes downsampling/eviction O(1).

Anomaly injection should support three archetypes covering 90% of real alerting scenarios: (1) spike — single-point multiplier of 5-10x for one tick, (2) level-shift — sustained offset for a random window, (3) flatline — zero-variance for a window (sensor stuck). Expose these as buttons so users can trigger them mid-simulation and watch retention/alert logic react. Never generate pure random walks — real TSDB data is overwhelmingly periodic, and random-walk demos mislead learners about what queries and alerts actually look like in production.
