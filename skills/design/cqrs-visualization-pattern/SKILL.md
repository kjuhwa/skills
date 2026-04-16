---
name: cqrs-visualization-pattern
description: Canvas-based real-time visualization of CQRS event flow, command/query separation, and latency asymmetry.
category: design
triggers:
  - cqrs visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# cqrs-visualization-pattern

CQRS visualization apps share a consistent dual-pane layout that mirrors the architectural split: a command (write) side on the left and a query (read) side on the right, connected by a central event bus or event store. The event-flow app uses canvas particle animations to show events traversing from command origin to read-model projection, with particle opacity decaying over lifetime to convey temporal propagation. The command-query-split app renders an immutable event store log in the center with a command form on one side and a projection/statistics panel on the other, reinforcing the idea that writes append events while reads replay them. Both approaches use a reactive render loop—`requestAnimationFrame` for animation or DOM re-render on every `dispatch()`—to keep the read model visually synchronized with the event store.

The latency monitor introduces a time-series line chart pattern specifically designed to expose the read/write performance asymmetry inherent in CQRS. Two data series (command latency in orange, query latency in teal) are plotted on a shared 0–120ms Y-axis using a sliding window of 60 points. Grid lines with scale labels provide context, and a metrics bar computes rolling averages and the cmd/qry ratio in real time. This pattern of overlaying write-path and read-path metrics on a single chart is reusable for any CQRS monitoring dashboard where the goal is to demonstrate that optimized read models deliver significantly lower latency than the write path.

Across all three apps, the color language is consistent: warm tones (orange `#f97316`) for command/write operations and cool tones (mint `#6ee7b7`) for query/read operations. This deliberate color-coding reinforces the CQRS separation visually and should be carried into any CQRS visualization to make the architectural boundary immediately legible. The apps also share a dark background theme (`#0f1117`) that makes the data channels pop, and all use vanilla Canvas2D rather than charting libraries, keeping the visualization self-contained and dependency-free.
