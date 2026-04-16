---
name: object-storage-visualization-pattern
description: Visualize object storage buckets using spatial metaphors (galaxy orbits, treemaps, particle flows) with consistent dark-theme HUD overlays and hover-driven inspection.
category: design
triggers:
  - object storage visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# object-storage-visualization-pattern

Object storage visualizations benefit from mapping bucket-level metrics (object count, aggregate size, operation type) onto spatial metaphors that encode hierarchy and proportion. The three proven patterns are: (1) **orbital/galaxy view** — buckets as orbiting planets where radius encodes size and orbit distance separates buckets, rendered on a full-screen canvas with elliptical paths and glow effects for visual weight; (2) **treemap view** — a squarified rectangle layout where area is proportional to bucket size, supporting drill-down into sub-prefixes (e.g., `videos/`, `2025/`) with a breadcrumb and back-navigation for hierarchical exploration; (3) **particle flow view** — real-time animated particles representing upload/download/delete operations traveling between client and a central storage node, with per-bucket swim lanes and color-coded operation types.

All three share a consistent dark theme (`#0f1117` background, `#1a1d27` panel surfaces, `#2a2d37` borders) and a fixed palette of bucket accent colors (`#6ee7b7` green, `#60a5fa` blue, `#f472b6` pink, `#fbbf24` amber, `#a78bfa` purple, `#fb923c` orange). HUD panels are fixed-position overlays showing aggregate stats (total objects, total size, throughput) with uppercase headings, small font sizing (11-14px), and a muted secondary color (`#6b7280`) for less critical data. Hover interactions reveal per-bucket detail via either a canvas-based info panel or a positioned tooltip div. Size formatting must handle GB/TB/PB thresholds consistently using a shared formatter (e.g., `mb >= 1e6 → PB, >= 1000 → TB, else GB`).

The reusable architectural pattern is: static bucket metadata as an in-memory array of `{name, objects, size, color}` objects, a full-viewport `<canvas>` or flex-filling `<div>` container, a `resize()` listener that re-initializes dimensions, `requestAnimationFrame`-driven render loops for animated views, and mouse event handlers that compute hover state per frame. Keeping bucket data as a flat array with denormalized display properties (color, orbit, radius) avoids runtime lookups and simplifies the render hot path.
