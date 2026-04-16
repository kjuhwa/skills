---
name: consistent-hashing-visualization-pattern
description: Canvas-based visual encoding for consistent hash rings with node-key assignment lines and per-node load counters.
category: design
triggers:
  - consistent hashing visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# consistent-hashing-visualization-pattern

Render the hash ring as a circle on an HTML Canvas where nodes and keys are placed at their hash-position angles (`pos * 2π − π/2`). Nodes are drawn as filled circles (radius ~10px) with distinct palette colors, while keys are smaller dots (radius ~5px) tinted with their owning node's color at reduced opacity. A thin line connects each key to its assigned node, using the node color with an alpha channel (`+ '44'`), making assignment visually traceable without cluttering the ring. A status bar below the canvas shows live counts (`N0: 5 keys | N1: 7 keys`) so imbalance is immediately visible.

The key-to-node assignment uses a clockwise walk: sort all node positions, then for each key find the first node whose hash position is ≥ the key's position, wrapping to `sorted[0]` when no node qualifies. This mirrors the real consistent-hashing lookup and means the visualization is not just decorative — it faithfully represents the algorithm. The hash function normalizes output to `[0, 1]` by dividing the unsigned 32-bit result by `0xFFFFFFFF`, which maps directly to a radian angle on the ring.

For migration-aware variants (before/after panels), compute assignment maps under both the old and new node sets, diff by key ownership, and highlight migrated keys with a CSS class (e.g., `.migrated` with a pulsing border or contrasting background). Display a stats line showing `Migrated: M/N keys (X%)` to quantify churn. This dual-panel pattern makes the "minimal disruption" property of consistent hashing tangible — users see that only keys in the arc between the departed/added node and its clockwise neighbor actually move.
