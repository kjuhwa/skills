---
name: time-series-db-visualization-pattern
description: Reusable canvas/SVG chart pattern for real-time and historical TSDB metric rendering with sliding windows and dual-axis scaling.
category: design
triggers:
  - time series db visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# time-series-db-visualization-pattern

TSDB visualizations follow a three-layer rendering architecture observed across live monitors, query sandboxes, and retention planners. The first layer is a sliding-window data buffer: points are pushed onto an array at a fixed ingestion interval (100-200ms for live streams) and evicted with `shift()` once a maximum window size is reached (typically 200 points). All coordinate mapping derives from dynamic min/max recalculation over this buffer, producing auto-scaling Y-axes. The X-axis maps timestamps linearly via `(point.t - minT) / rangeT * width`, while Y maps values via `height - (point.v - minV) / rangeV * height`, with a consistent padding constant (30-40px) reserved for axis labels rendered in monospace at 8-12px.

The second layer is the chart fill gradient. Both canvas and SVG variants draw a polyline stroke (2px, accent color `#6ee7b7`) then close the path downward to the X-axis baseline to create a filled area with a vertical linear gradient fading from 25% opacity at the top to 0% at the bottom (`#6ee7b744` to `#6ee7b700`). This gives depth without obscuring grid lines. Grid lines are rendered as 4-5 horizontal rules at even value intervals with right-aligned labels. For SVG implementations, a `viewBox` with fixed logical coordinates (e.g., `0 0 400 200`) enables responsive scaling without JavaScript resize handlers, while canvas implementations require an explicit `onresize` handler that sets `canvas.width = offsetWidth`.

The third layer is the data detail table beneath the chart, limited to 50 rows with oldest-first eviction. Each row shows ISO-formatted timestamp (trimmed to `HH:mm:ss.SSS`), metric name, numeric value (2 decimal places), and tag key-value pairs. The table uses `position: sticky` headers on a scroll-constrained container (max-height 200px). The shared dark theme uses background `#0f1117`, card/panel background `#1a1d27`, border color `#2a2d37`, accent `#6ee7b7`, and muted text `#8b949e` — a palette designed for prolonged monitoring without eye strain.
