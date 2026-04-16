---
name: data-pipeline-visualization-pattern
description: SVG/Canvas dark-theme pattern for rendering pipeline stages, animated record flow, and throughput charts with color-coded health states.
category: design
triggers:
  - data pipeline visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# data-pipeline-visualization-pattern

Data pipeline visualizations share a consistent visual language: a dark background (#0f1117/#1a1d27) with teal/emerald accents (#6ee7b7) representing healthy flow and red (#f87171) for failures. Pipeline stages are rendered as connected rectangular nodes arranged left-to-right, joined by dashed connector lines (stroke-dasharray="6,3") to convey directionality. For real-time flow monitoring, SVG circles act as animated "record particles" moving across stages via requestAnimationFrame, with per-record speed variance (0.8-1.4 px/frame) creating natural throughput heterogeneity. For throughput dashboards, Canvas 2D line charts with a fixed Y-axis (e.g., 0-1000 rec/s) and 5-line grid render multi-pipeline time series using distinct colors per pipeline. DAG builders use SVG groups (<g>) containing rect+text+circle port elements, with draggable nodes and click-to-link edge creation between output and input ports.

The critical design decisions are: (1) use SVG for interactive node-graph UIs where individual elements need hit-testing and drag events, but use Canvas for dense time-series charts where per-pixel control and fast full-redraws matter; (2) represent pipeline health through both color transitions on nodes (idle→active→completed as #262a36→#1a4a3a→#143026) and sidebar metric bars whose width maps throughput to percentage (Math.min(100, value/maxExpected*100)); (3) keep stage spacing uniform (e.g., 175px intervals) with intra-stage progress tracking so record particles visually "process" within each stage before advancing. Dashed connectors between stages should be drawn behind nodes (SVG prepend or Canvas layering) so dragging doesn't obscure the flow direction.

A reusable scaffold includes: a stats bar showing processed/failed/queued counts, a central SVG or Canvas visualization area, and an event log or sidebar with per-pipeline metrics. The stat counters update on every animation tick, the log uses LIFO prepend with a cap (e.g., 60 entries) to prevent DOM bloat, and sidebar health bars use CSS transitions (width 0.4s) to smooth discrete throughput jumps into fluid animations.
