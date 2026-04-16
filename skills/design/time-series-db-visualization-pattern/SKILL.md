---
name: time-series-db-visualization-pattern
description: Reusable visual encoding patterns for rendering time-series metric streams, retention tiers, and ingestion throughput in zero-dependency browser apps.
category: design
triggers:
  - time series db visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# time-series-db-visualization-pattern

Time-series visualization demands three distinct visual layers that recur across TSDB tooling: a **rolling-window line/area chart** for real-time metric streams, a **tiered retention heatmap** showing data density across compaction levels (raw → 5m → 1h → 1d), and a **throughput gauge** encoding ingestion rate as both a numeric counter and a fill-bar that shifts color from green (#6ee7b7) through amber to red as it approaches saturation. The canvas-based rolling chart should use a fixed-size circular buffer (e.g., 300 points) and `requestAnimationFrame` redraws — never append to an unbounded array — with the x-axis representing wall-clock time and auto-scaling the y-axis to the visible window's min/max plus 10% padding.

Retention visualization works best as a horizontal stacked bar or heatmap grid where each row is a retention tier and columns represent time buckets. Color intensity maps to point density (log scale), and hovering a cell should display the exact count, average interval, and estimated storage size. This pattern lets operators instantly spot gaps where downsampling dropped data or compaction stalled. The ingestion monitor panel should combine a sparkline (last 60s of write throughput) with a cumulative counter and a badge showing current backlog depth. Use SVG for the retention heatmap (better hit-testing for tooltips) and canvas for the streaming sparkline (better performance at high update rates).

A shared `TimeSeriesRenderer` abstraction accepts a config object `{ bufferSize, yDomain, colorScale, tickInterval }` and exposes `push(timestamp, value)` plus `render(canvasCtx)`. All three apps reuse this core — the query playground renders query-result latency, the retention visualizer renders compaction state, and the ingestion monitor renders write rate. Dark theme constants (`bg: #0f1117`, `surface: #1a1d27`, `grid: #2a2d37`, `accent: #6ee7b7`) are defined once in a shared palette object.
