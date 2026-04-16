---
name: distributed-tracing-visualization-pattern
description: Three complementary visual encodings for rendering distributed traces — waterfall timeline, service topology graph, and span flame chart.
category: design
triggers:
  - distributed tracing visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# distributed-tracing-visualization-pattern

Distributed tracing data maps naturally to three visual encodings, each optimized for a different analytical question. The **waterfall timeline** renders spans as horizontal bars on a shared time axis: each row is a service name (fixed-width label column, ~180px), and the bar's `left` and `width` are computed as `(span.start / maxEnd) * 100%` and `(span.dur / maxEnd) * 100%` respectively. Spans are sorted by start time, color-coded per service from a fixed palette, and display duration labels (`Nms`) anchored just outside the bar's right edge. This view answers "where did latency accumulate across the call chain?" The key CSS pattern is a flex row with a fixed label + a `position:relative` track containing `position:absolute` bars.

The **service topology** uses a full-viewport Canvas with nodes arranged in a polar layout (`angle = (i / count) * 2π`, `radius = min(W,H) * 0.3`). Edges are drawn as simple lines with low-opacity stroke (`rgba(110,231,183,0.12)`), and animated particles travel from source to target at randomized speeds (`t += 0.005..0.02`) with opacity fading as `1 - t`. Nodes are circles with stroke outlines and centered text labels. A mousemove hit-test (`hypot(dx,dy) < node.r`) drives a floating tooltip showing service name and requests/sec. This view answers "which services talk to each other and how busy are the edges?"

The **span flame chart** uses SVG `<rect>` elements stacked by call depth (y = `depth * (rowHeight + padding)`), with x/width computed identically to the waterfall but from a recursive tree generator. Text labels are conditionally rendered only when the rect is wide enough (> 40px). Click-to-inspect on each rect populates a fixed-bottom detail bar showing span ID, service, duration, start offset, and depth. This view answers "what is the nested call structure and which subtree dominates?" All three share a dark theme (`#0f1117` bg, `#6ee7b7` accent, Courier New monospace) and per-depth/per-service color palette indexing via `colors[i % colors.length]`.
