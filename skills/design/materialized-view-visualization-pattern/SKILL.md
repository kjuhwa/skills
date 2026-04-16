---
name: materialized-view-visualization-pattern
description: Render MV dependency graphs, freshness dashboards, and query plans using Canvas/SVG with staleness-aware color coding.
category: design
triggers:
  - materialized view visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# materialized-view-visualization-pattern

Materialized view systems require three complementary visualizations, each mapping to a distinct operational concern. **Dependency graphs** use Canvas node-link diagrams where base tables and MVs are positioned nodes connected by directed arrows showing data flow; nodes are color-coded by staleness (teal `#6ee7b7` for fresh, red `#f85149` for stale) and display metadata on hover (row count, last refresh, source tables). **Freshness dashboards** use a responsive CSS Grid of status cards, each containing a progress bar (`elapsed / refreshCycleSec`) and a sparkline canvas tracking historical refresh latency over a 20-point sliding window; status thresholds at 80% (warning/orange `#d29922`) and 100% (stale/red) of the configured refresh interval drive both border-color and indicator styling. **Query execution plans** use SVG flow diagrams that fork between an optimized MV-rewrite path (Query → Rewrite → MV Scan → Result) and a full table-scan path (Query → Seq Scan → Join → Result), toggled by a relevance score computed from table overlap, aggregation function match, and GROUP BY column alignment.

All three visualizations share a GitHub-dark palette (`#0f1117` background, `#161b22` surfaces, `#8b949e` muted text) and avoid charting libraries entirely — Canvas 2D context handles graphs and sparklines, SVG handles flow diagrams. This zero-dependency approach keeps bundles small and allows pixel-level control over staleness indicators, arrow markers, and hover hit-testing via coordinate math rather than DOM queries. Interactive refresh actions (per-view or bulk) mutate the data model in place and re-render immediately, simulating the operational loop of detect-stale → trigger-refresh → confirm-fresh.

The key design decision is encoding *operational urgency* into every visual element: node fill color, card border color, progress bar width, and plan-diagram path selection all derive from the same underlying staleness/score metric, giving operators a consistent visual vocabulary across dependency, monitoring, and query-planning views.
