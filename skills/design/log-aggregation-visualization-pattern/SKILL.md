---
name: log-aggregation-visualization-pattern
description: Reusable visual encoding patterns for rendering log volume, severity distribution, and pipeline topology on a dark-themed ops dashboard.
category: design
triggers:
  - log aggregation visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# log-aggregation-visualization-pattern

Log aggregation UIs share three complementary visual layers that map directly to operator mental models. **Time-series severity stacking** (as in log-stream-monitor) uses a canvas with 60 one-second buckets, each a stacked bar of error/warn/info/debug segments color-coded on a red-amber-green-grey severity ramp (`#f7768e`, `#e0af68`, `#9ece6a`, `#565f89`). The key technique is capping each segment height (`Math.min(count * scaleFactor, maxHeight / numLevels)`) so a single noisy level cannot swallow the chart, and shifting buckets via `Array.shift()/push()` on a 1-second timer to create a sliding-window effect without re-allocating. **Pattern-frequency heatmaps** (as in log-pattern-heatmap) plot named error patterns (AuthFailure, Timeout, OOMKill, etc.) against hourly time slots. Cell color is resolved through stepped thresholds rather than continuous interpolation — four discrete stops from dark background through teal to bright mint — which avoids the perceptual ambiguity of continuous gradients when operators need to triage at a glance. Interactive tooltips on `mousemove` resolve the cell's `(row, col)` from pointer coordinates and the grid geometry, displaying pattern name, time bucket, and occurrence count. **Pipeline topology flow** (as in log-pipeline-flow) renders the DAG of pipeline stages (sources → collectors → processors → storage → alerts) as SVG node boxes connected by dashed edges, with animated particle dots (`circle` elements advancing along edge vectors via `requestAnimationFrame`) conveying throughput direction and magnitude. Each node carries a live `evt/s` counter, and a metrics bar below aggregates ingestion rate, latency, drop rate, and storage growth. All three views share a unified dark palette (`#0f1117` background, `#1a1d27` panels, `#6ee7b7` accent), devicePixelRatio-aware canvas sizing, and a toolbar/stats header pattern that keeps controls above and data below.

The reusable template is: pick one view per operator question — stacked timeline for "is something spiking right now?", heatmap for "which patterns recur and when?", topology flow for "where in the pipeline is the bottleneck?" — and compose them on a shared color system and resize handler. Severity colors must remain consistent across all three views so operators build a single mental mapping. Feed-style DOM lists (prepend new, evict old beyond a cap like 200 nodes) complement the canvas/SVG views for grep-style detail without replacing the aggregate picture.
