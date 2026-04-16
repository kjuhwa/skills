---
name: etl-visualization-pattern
description: Animated stage-based pipeline visualization for ETL flows with extract/transform/load phases
category: design
triggers:
  - etl visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# etl-visualization-pattern

ETL visualization apps share a three-stage horizontal flow metaphor: source (extract) → transformation (transform) → sink (load). Render each stage as a distinct node/column with animated data packets (dots, rows, or records) flowing left-to-right along connector edges. Use color coding to represent data health—green for clean records, yellow for warnings, red for quality failures or rejected rows. Stage nodes should expose throughput counters (rows/sec), backlog depth, and current transformation rules, all updating in real-time via requestAnimationFrame ticks.

For the transform stage specifically, visualize the rule pipeline as stacked sub-nodes (filter → map → aggregate → validate), letting users toggle each rule on/off to see immediate impact on the downstream load count. The data quality radar pattern adds a polar chart overlay showing completeness, validity, uniqueness, consistency, timeliness, and accuracy dimensions—this is the canonical DQ hexagon. Always include a "tail" panel showing the last 20 records that passed through, with inline diff highlighting to show what each transformation rule changed. Pause/step/reset controls are essential because users need to inspect individual record transitions, not just watch the stream fly by.
