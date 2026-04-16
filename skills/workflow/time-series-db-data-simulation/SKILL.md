---
name: time-series-db-data-simulation
description: Generate realistic TSDB metric streams using sinusoidal base curves with random noise, configurable step intervals, and storage-cost estimation at 16 bytes per point.
category: workflow
triggers:
  - time series db data simulation
tags:
  - auto-loop
version: 1.0.0
---

# time-series-db-data-simulation

Simulating time-series data for TSDB prototypes requires three layers: a per-metric base value (e.g., CPU ~50%, memory ~70%, disk_read ~200 MB/s), a periodic oscillation via `Math.sin(timestamp / period)` scaled to ~30% of the base to create diurnal or cyclic patterns, and additive random noise `(Math.random() - 0.5) * base * 0.2` to prevent the chart from looking synthetic. The combination `base + sin(t/T) * base * 0.3 + noise` produces waveforms that visually resemble real infrastructure metrics. Each point is stored as a `{ t: timestamp_ms, v: float }` pair, and a sliding window (typically 120-200 points) caps memory for live streaming scenarios.

Step interval calculation adapts to the selected time range: `step = max(rangeSeconds / 120, 5) * 1000` ensures roughly 120 data points regardless of whether the user selects 5 minutes or 24 hours, preventing both sparse charts (too few points) and browser tab crashes (millions of points for long ranges). For retention and capacity planning, use 16 bytes per raw point (8-byte timestamp + 8-byte float64) as the storage constant. Total raw storage is `ingestionRate * 86400 * retentionDays * 16`, and downsampled storage is `(86400 / dsIntervalSeconds) * dsRetentionDays * 16`, letting users see that a 5-minute downsample at 90 days retains < 0.01% of the raw points.

Clamping generated values to domain-valid ranges (`Math.max(0, Math.min(100, v))` for percentages) prevents chart artifacts like negative CPU usage. Ingestion rate tracking—`pointCount / elapsedSeconds`—provides a live throughput indicator that doubles as a sanity check: if the displayed rate diverges from the configured interval, the simulation loop is falling behind or the browser tab is throttled.
