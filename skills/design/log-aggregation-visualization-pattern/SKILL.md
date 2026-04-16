---
name: log-aggregation-visualization-pattern
description: Dark-themed multi-view log visualization using Canvas/SVG with severity-coded color scales and interactive drill-down.
category: design
triggers:
  - log aggregation visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# log-aggregation-visualization-pattern

Log aggregation visualizations converge on three complementary views that each answer a different operational question: a **time-series waterfall** (Canvas) for "what is happening right now?", a **service×time heatmap grid** (Canvas) for "where did volume concentrate over a period?", and a **topology ring** (SVG) for "which component in the dependency graph is unhealthy?" All three share a dark background (#13151e–#1a1d27), a four-tier severity palette (DEBUG:#444, INFO:#60a5fa, WARN:#fbbf24, ERROR:#f87171), and an interaction model where hover shows a tooltip summary and click opens a detail panel with per-level breakdowns. The severity palette should be applied consistently across every view so operators build muscle memory around color meaning.

The waterfall uses a fixed-width rolling column buffer (e.g. 60 columns shifted via `push`/`shift`) where each column accumulates counts per level, redrawn at ~200ms. The heatmap pre-computes a `SERVICES × HOURS` matrix and maps cell totals to a four-stop gradient (green→blue→yellow→red) via a `color(value, max)` helper, with rounded-rect cells for visual separation. The topology ring positions N nodes at equal angles on a circle (`2π·i/N − π/2`), sizes each node proportionally to `total/scaleFactor`, and tints fill+stroke by error threshold bands (>20 red, >10 yellow, else green) with an SVG glow filter. Edges are simple `<line>` elements connecting node indices. All three views resize responsively—Canvas reads parent `getBoundingClientRect`, SVG updates its `viewBox` on `window.onresize`.

The key reusable pattern is the **severity-color contract**: define `LEVELS` and `COLORS` once as shared constants, then let every renderer—bar stack, heatmap cell gradient, or node tint—derive its palette from the same map. This keeps a multi-panel log dashboard visually coherent without coupling the renderers to each other. Add a level-filter dropdown that replays the in-memory log buffer on change rather than re-fetching, enabling instant client-side slicing.
