---
name: object-storage-visualization-pattern
description: Reusable canvas/DOM patterns for visualizing object-storage buckets, objects, and lifecycle stages as interactive spatial metaphors.
category: design
triggers:
  - object storage visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# object-storage-visualization-pattern

Object-storage visualizations map storage hierarchy (buckets → prefixes → objects) onto spatial metaphors that reveal structure invisible in flat file listings. Three proven layouts emerge: (1) **Orbital/Galaxy** — buckets as concentric orbits around a central "storage endpoint" node, with individual objects as animated particles orbiting at radii proportional to bucket depth; each object carries metadata (key name, size in KB) exposed via hit-test tooltips using `Math.hypot` distance checks against mouse position. (2) **Treemap** — a squarified rectangle layout where area encodes cumulative size in MB, enabling drill-down from root → bucket → prefix → leaf object via click navigation with breadcrumb state tracking; the `layout(nodes, x, y, w, h)` function recursively partitions space by `totalSize(n)/total` fraction along the shorter axis. (3) **Lifecycle Flow** — a left-to-right stage pipeline (Ingest → Hot → Warm → Archive → Deleted) with particles representing objects transitioning between storage tiers; each particle tracks `stage`, `progress` counter, and `speed`, advancing to the next tier after a randomized dwell time.

All three share a dark-theme palette (#0f1117 background) with per-bucket color coding (#6ee7b7 green, #f472b6 pink, #60a5fa blue, #fbbf24 amber, #a78bfa purple) that maps consistently to the same logical buckets across views. Interactive feedback uses hover-brightness transitions for DOM elements and glow-ring halos (`arc` with alpha-reduced strokeStyle) for canvas particles. The consistent pattern is: assign each bucket/tier a stable color, generate synthetic object metadata (key name via `Math.random().toString(36)`, size via random range), and animate with `requestAnimationFrame` for canvas views or CSS transitions for DOM treemaps.
