---
name: data-pipeline-visualization-pattern
description: Reusable visual encoding patterns for rendering data pipeline stages, DAG topology, and record flow on Canvas/SVG.
category: design
triggers:
  - data pipeline visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# data-pipeline-visualization-pattern

Data pipeline UIs share a horizontal stage-chain layout where each processing step (Ingest, Parse, Validate, Transform, Enrich, Load) is rendered as a rounded-rect node connected by directional edges. The Canvas-based flow monitor animates individual records as particles traveling left-to-right through the chain, using color to encode state — green (#6ee7b7) for healthy records, red (#f87171) for failures — and sine-wave vertical offset to convey motion. Failed records drift downward with a fade-out alpha, giving an immediate visual signal of where in the pipeline errors concentrate. This particle-over-stage pattern is the most effective encoding for real-time pipeline health because it simultaneously communicates topology, throughput volume (particle density), and failure location without requiring a separate dashboard.

For structural editing, an SVG-based DAG builder lets users drag pipeline nodes and double-click to link them with directed edges (marker-end arrows). The "Run Pipeline" animation sequentially activates edges with a dashed stroke-dasharray animation, simulating execution order propagation through the graph. Node colors are assigned by role — source (green), transform (blue), join (amber), sink (purple) — establishing a consistent semantic palette across all pipeline views. This role-based coloring convention should be carried into any companion dashboard so that a user switching between the topology editor and the monitoring view never has to re-learn which color means what.

The throughput dashboard pairs a time-series area chart (gradient fill under a line plot of events/sec over a 60-sample sliding window) with a per-stage latency bar chart. KPI cards at the top surface the four critical pipeline metrics — throughput, average latency, error rate, and backpressure percentage — as large-font headline numbers. The key reusable insight is layering: cards for at-a-glance status, line chart for temporal trend, bar chart for per-stage breakdown. All three apps share the same dark theme (#0f1117 background, #1a1d27 panel surfaces, #6ee7b7 accent) which should be treated as the canonical pipeline visualization palette.
