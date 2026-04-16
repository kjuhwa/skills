---
name: bloom-filter-visualization-pattern
description: Render bloom filter bit arrays as interactive grid/network visuals with hash-path tracing and fill-rate stats.
category: design
triggers:
  - bloom filter visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# bloom-filter-visualization-pattern

A bloom filter visualization requires three visual layers: the **bit array itself** (grid or linear strip), the **hash mapping paths** (which input maps to which bit positions), and **aggregate statistics** (fill ratio, item count, bits set). The visualizer app uses a canvas grid where each cell represents one bit index, colored by state (set/unset) and highlighted when a word is being added or checked. The network app takes this further with an SVG three-column layout — words on the left, hash function nodes in the center, and bit positions on the right — connected by color-coded directional arrows that reveal collisions when two words light up the same bit.

The critical reusable pattern is **highlight-on-action**: when a user adds or queries a word, the k bit positions produced by the hash functions are visually emphasized before the result is shown. This makes the probabilistic nature tangible — users see that "probably exists" means all k bits happened to be set, possibly by different words. For the bit-array grid, use a cols/rows layout with `canvas.clientWidth / cols` cell sizing and DPR-aware scaling (`devicePixelRatio` multiplied into canvas dimensions, then `ctx.scale(dpr, dpr)`). Color-code three states: unset (dark, e.g. `#1a1d27`), set (green, e.g. `#2f6b55`), and actively highlighted (bright green `#6ee7b7` or contextual color per word).

Stats should always include: item count inserted, bits set out of total, and fill percentage (`bitsSet / totalSize * 100`). The fill percentage is the single most important metric for users to understand filter saturation — once it approaches 50-60%, false positive rates climb sharply, which ties directly into the benchmark companion app.
