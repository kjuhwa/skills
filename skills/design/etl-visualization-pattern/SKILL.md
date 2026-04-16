---
name: etl-visualization-pattern
description: Visual encoding patterns for representing ETL pipeline stages, data flow direction, and processing state transitions in dark-themed dashboards.
category: design
triggers:
  - etl visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# etl-visualization-pattern

ETL pipelines have a natural left-to-right three-stage topology (Extract → Transform → Load) that maps directly to a horizontal SVG node graph. Each stage is rendered as a bordered card containing sub-source boxes (e.g., PostgreSQL, CSV Files, REST API for Extract; Clean Nulls, Map Schema, Aggregate for Transform). Stages connect via dashed arrows with directional polygon arrowheads to convey flow direction. During execution, individual source boxes highlight with accent-colored strokes (#6ee7b7 green) in sequence to show which sub-step is actively processing, creating a progressive illumination effect that communicates both progress and stage identity without needing numeric percentages.

For monitoring views, the pattern shifts to a status-badge + progress-bar card list. Each ETL job card displays a source→destination label (e.g., "Kafka → BigQuery"), a row count, elapsed duration, and a colored progress bar where the fill color encodes state: green for running, blue for done, red for failed, amber for queued. A top-level stats strip aggregates KPIs (total jobs, running count, completed count, total rows processed) as large numeric callouts. This dual-layer approach — summary stats above, per-job detail below — lets operators glance at aggregate health then drill into individual pipelines.

For data profiling views, use a 2×2 card grid: a donut chart for overall data completeness percentage, a bar chart showing null counts per column (red bars for columns with nulls, green-tinted for clean columns), a sparkline for ingestion volume over time, and a column-type manifest listing each field name paired with its SQL type. Below the grid, a preview table renders sample rows with NULL values highlighted in red italic to make data gaps immediately scannable. The consistent dark theme (#0f1117 background, #1a1d27 cards, #6ee7b7 accent) unifies all three views into a cohesive ETL operations UI.
