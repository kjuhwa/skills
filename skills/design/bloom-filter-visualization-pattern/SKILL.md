---
name: bloom-filter-visualization-pattern
description: Reusable visual encoding patterns for rendering Bloom filter bit-arrays, hash distribution, and false-positive probability curves in zero-dependency browser apps.
category: design
triggers:
  - bloom filter visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# bloom-filter-visualization-pattern

The core visual metaphor for a Bloom filter is a **horizontal bit-array strip** — a row of cells where each cell represents one bit in the filter's backing array. Inserted elements trigger k hash functions, and the corresponding bit positions light up (e.g., transitioning from `#1a1d27` dim to `#6ee7b7` accent). Animate each insertion as a cascade: first show the element entering, then fan out k lines (one per hash function) to the target bit indices, then fill those cells. Use `canvas` for arrays over ~256 bits and inline `<div>` grids for smaller demonstrations. Color-code collisions — when a bit is already set, flash it `#fbbf24` (warn) instead of accent to make hash overlap visually obvious.

The second panel should render a **false-positive probability gauge** that updates live as elements are inserted. The classic formula `(1 - e^(-kn/m))^k` maps cleanly to a filled arc or thermometer. Plot the theoretical curve as a dimmed SVG `<path>` and overlay the empirical rate (tested by probing random non-members) as bright dots. This dual view teaches users why the filter degrades and at what fill ratio it becomes unreliable. A slider controlling `m` (bit-array size) or `k` (hash count) lets users see the curve shift in real time.

For comparison views (e.g., bloom-filter-comparison), use a **side-by-side or stacked layout** with synchronized insertions so the same element enters multiple filters simultaneously. Differentiate configurations by border color and show a shared scoreboard tracking: bits set, fill ratio, false-positive rate, and memory bytes. Animate membership queries by highlighting the k bit positions and rendering a checkmark (true positive / true negative) or warning icon (false positive). This query animation is the most instructive part — without it, Bloom filters feel like an opaque box.
