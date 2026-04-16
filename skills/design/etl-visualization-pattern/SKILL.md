---
name: etl-visualization-pattern
description: Visual encoding patterns for representing ETL pipeline stages, data flow, and job status on canvas/SVG.
category: design
triggers:
  - etl visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# etl-visualization-pattern

All three ETL apps share a consistent three-column spatial layout mapping to the Extract → Transform → Load stages. The pipeline-viz (SVG) uses colored rectangles per stage type (extract=#3b82f6, transform=#f59e0b, load=#6ee7b7) connected by animated dashed-line links with arrow markers. The data-flow (Canvas) places vertical column bands at fixed x-percentages (10%, 30%, 55%, 80%) and animates particles flowing left-to-right between them, with error particles diverging downward at the transform stage. The dashboard uses an area chart with the same green (#6ee7b7) to show row throughput over a 30-point sliding window. The reusable pattern is: assign each ETL stage a fixed spatial column and a semantic color, then animate data movement between columns — SVG stroke-dasharray pulses for pipeline topology views, canvas particle systems for real-time flow volume, and area/line charts for historical throughput.

When building an ETL visualization, start with the stage-column scaffold: define an array of stage objects each carrying a label, x-position ratio, and hex color. Render these as either SVG groups (for interactive drag-and-drop topology editing) or canvas column bands (for high-particle-count animation). Connections between stages should interpolate toward the next stage's x-coordinate using easing (the data-flow app uses `(target.x - p.x) * 0.02 * speed`), which produces a natural deceleration as particles approach each gate. For error visualization, branch particles off the main flow axis at the stage where the error occurs and fade their alpha, making failures visible without cluttering the happy path. KPI counters (extracted/transformed/loaded/errors) should update in real-time alongside the animation to give both visceral and quantitative feedback.

The drag-to-reorder interaction in the pipeline-viz demonstrates a lightweight node-graph pattern: each node is an SVG `<g>` with a mousedown listener that captures offset, mousemove updates the transform and redraws links, mouseup releases. This avoids heavy graph libraries while still giving users a tactile sense of pipeline topology. When scaling beyond three stages (e.g., adding validation, dedup, or enrichment transforms), insert new stage objects into the array and re-derive column positions proportionally — the percentage-based x-positioning in the data-flow app already supports this naturally.
