---
name: time-series-db-visualization-pattern
description: Visualize time-series database internals through synchronized timeline, storage blocks, and downsampling tier panels
category: design
triggers:
  - time series db visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# time-series-db-visualization-pattern

Time-series DB explorers need multi-panel layouts that expose the unique temporal+storage duality of TSDBs. The canonical layout splits the screen into three coordinated regions: (1) a top timeline chart showing raw sample ingestion with configurable time windows (1m/5m/1h/1d) and a vertical scrubber, (2) a middle "chunk/block" strip rendering immutable storage blocks as horizontal bars colored by compaction tier (head → L0 → L1 → L2), and (3) a bottom "downsampling tiers" panel showing how raw points collapse into 5m, 1h, 1d rollups with point-count ratios displayed numerically.

The key interaction pattern is the shared time cursor — hovering any panel broadcasts the timestamp to all others, highlighting the corresponding chunk boundary, rollup bucket, and raw sample cluster. Use a time-proportional x-axis (not index-based) so gaps in ingestion are visually obvious. Block bars should encode three dimensions: x-position (time range), width (block duration), and fill opacity (sample density per block). For retention-policy and anomaly views, overlay a semi-transparent "retention boundary" vertical line that sweeps left-to-right as simulated time advances, with blocks fading as they cross the boundary.

Always include a small stats sidebar showing live counters: samples/sec, head chunk size, total series cardinality, and bytes-on-disk. These four metrics are what TSDB operators actually watch, so surfacing them alongside visualizations makes the tool feel authentic rather than academic. Use monospace fonts for all numeric displays and a dark theme by default — TSDB dashboards (Grafana, Chronograf) have conditioned users to expect it.
