---
name: bloom-filter-visualization-pattern
description: Reusable UI patterns for rendering bloom filter bit arrays as interactive grid, ring, or chart visualizations.
category: design
triggers:
  - bloom filter visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# bloom-filter-visualization-pattern

Bloom filter visualizations work best with three complementary representations, each suited to a different pedagogical goal. The **grid layout** (used in the visualizer app) maps M bits onto a rectangular canvas — e.g., 64 bits as 16×4 — where each cell is a colored rectangle toggled on add/check operations. Highlight the K hash positions momentarily in a distinct accent color (orange for add, blue for check) before settling into the "set" color (teal/green), so the user sees *which* bits a particular element touches. Pair the grid with a live statistics panel showing items inserted, bits set, and fill ratio — this trio gives immediate intuition about filter saturation.

The **ring layout** (used in the spam demo) arranges M bits as circles on an SVG arc, which naturally communicates the modular arithmetic of `hash % M`. Set bits render in teal, unset in dark gray; when a probe fires, the K target positions flash red (blocked) or green (passed) before returning to base state. This works well for small filters (16–64 bits) in scenario-driven demos where the audience cares about outcomes, not theory. For analytical contexts, the **line chart** (used in the false-positive lab) plots empirical vs. theoretical false-positive rates on a Canvas with items-inserted on the X axis and FP% on the Y axis. Draw the theoretical curve `P = (1 − e^(−kn/m))^k` as a dashed reference line and overlay the empirical series as a solid line with dot markers so divergence is immediately visible.

Across all three representations, the core rendering loop is the same: maintain a `bitArray[m]` of 0/1 values, expose `add(item)` and `check(item)` that call K seeded hash functions (`(seed × 31 + charCode) % m`), and after each mutation trigger a `render()` pass that redraws only changed bits. Keep the hash function, bit array, and rendering concerns in separate layers so the same data model can drive any of the three visual modes without duplication.
