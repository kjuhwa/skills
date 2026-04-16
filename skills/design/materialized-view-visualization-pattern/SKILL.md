---
name: materialized-view-visualization-pattern
description: Render MV dependency DAGs, refresh timelines, and base-vs-MV query comparisons as interactive dark-themed canvas/DOM visualizations.
category: design
triggers:
  - materialized view visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# materialized-view-visualization-pattern

The DAG visualization models materialized views as a three-column directed graph: source tables on the left, materialized views in the center, and downstream consumers (live views, dashboards) on the right. Each node encodes its type through color (`#3b82f6` for tables, `#6ee7b7` for MVs, `#f59e0b` for consumers), carries metadata (row count, defining query, staleness flag), and supports drag repositioning. Edges are drawn as curved quadratic arrows with directional arrowheads, and hovering a node highlights its immediate dependency edges, making it easy to trace which source tables feed a given MV. Stale nodes pulse with a red shadow (`#ef4444`) and display a "STALE" badge above the circle, providing at-a-glance freshness status across the entire dependency tree.

The refresh monitor uses a card grid where each card represents one materialized view and encodes three time dimensions simultaneously: a progress bar showing elapsed time as a fraction of the refresh interval, a sparkline SVG of the last 20 refresh durations (wall-clock ms), and a state badge cycling through OK/REFRESHING/STALE. The card border color and CSS pulse animation change with state transitions, so operators can scan dozens of views at once and spot anomalies by color alone. Each card also displays schema, row count, size, and the defining aggregation query, giving enough context to triage without switching tools.

The query-diff panel places two side-by-side panels — live base-table aggregation vs. pre-computed MV lookup — and lets the user run each independently. After both complete, a bar chart renders the absolute latency of each path and computes the speedup ratio (e.g., "47× faster"). The simulated base query scans 80K rows with a randomized 800–2000ms delay while the MV lookup resolves in 2–17ms, making the performance gap viscerally clear. Queries rotate on a 25-second timer to show different aggregation patterns (revenue roll-ups, top-N product rankings), reinforcing that the MV advantage applies across query shapes, not just one workload.
