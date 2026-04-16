---
name: distributed-tracing-visualization-pattern
description: Reusable visualization patterns for rendering distributed traces as waterfall timelines, service topology graphs, and span flame charts.
category: design
triggers:
  - distributed tracing visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# distributed-tracing-visualization-pattern

Distributed tracing visualizations share three complementary projections of the same trace data: **waterfall timelines**, **service topology graphs**, and **span flame charts**. The waterfall uses Gantt-style horizontal bars where each span's left-position is `(span.start / traceEnd) * 100%` and width is `(span.duration / traceEnd) * 100%`, rendering service names in a fixed-width label column alongside a flexible timeline track. The topology view arranges services in a circular layout using `angle = (i / count) * 2π`, connects them with low-opacity directed edges, and overlays animated particles that interpolate position along edges (`x = a.x + (b.x - a.x) * t`) to convey live traffic flow. The flame chart stacks spans vertically by call depth (`y = depth * rowHeight`) with width proportional to duration, using recursive tree layout where children are fractionally allocated within parent bounds and packed sequentially with small inter-span gaps (`cursor += childWidth + gap`).

Color assignment must be **service-identity-based**, not index-based or depth-based. Index-cycling (e.g., `palette[i % 8]`) causes the same service to appear in different colors across traces, destroying visual continuity. Depth-cycling (`palette[depth % n]`) conflates service identity with call depth. Instead, maintain a `serviceColorMap` that assigns a deterministic color per service name. For the flame chart specifically, enforce a minimum visible width (`min-width: 3-4px`) so sub-millisecond spans remain clickable, and display duration labels only when the bar exceeds ~50px to prevent text overflow. Hover/click interactions should reveal span metadata (traceId, spanId, service, operation, duration, status) in a fixed detail panel rather than ephemeral tooltips, enabling comparison across selections.

All three projections should share normalized timing coordinates derived from the same root span. Compute `traceStart = min(allSpans.start)` and `traceEnd = max(allSpans.start + allSpans.duration)` once, then normalize all positioning against this range. The waterfall and flame chart share the same x-axis (time), so they can be stacked vertically with a synchronized scroll/zoom for cross-view correlation. The topology view supplements this with aggregate metrics (p99 latency, RPS) per node and per edge, surfaced on hover. For rendering, prefer SVG for <500 spans (supports native event handling and accessibility) and switch to Canvas for larger traces, using spatial indexing (quadtree) for hit detection instead of per-element listeners.
