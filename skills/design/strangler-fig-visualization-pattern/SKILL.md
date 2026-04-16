---
name: strangler-fig-visualization-pattern
description: Canvas and SVG rendering patterns for visualizing incremental host-replacement lifecycles with stage-aware color coding and animated growth indicators.
category: design
triggers:
  - strangler fig visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# strangler-fig-visualization-pattern

The strangler-fig visualization pattern uses a dual-layer rendering approach: a **host entity** drawn with decreasing opacity (`globalAlpha = 1 - fade * 0.8`) and **parasite overlay elements** whose size, opacity, and color intensify proportionally to a `progress` ratio (`length / maxLen`). This models the core strangler-fig dynamic where the new system visually overtakes the old. In the simulator, quadratic Bézier curves (`quadraticCurveTo`) radiate from attachment points on the host trunk, simulating aerial root growth — each root tracks independent `length`, `maxLen`, `growth` rate, and `angle`, producing organic asymmetry. The ecosystem app maps this to SVG circles with pulsing `<animate>` rings whose radius oscillates from `r` to `r+14`, conveying liveness per species. Both approaches share a key insight: the host's visual weight must **diminish in lockstep** with parasite growth so the viewer perceives replacement, not mere addition.

Color encoding is stage-aware and consistent across apps: seed/legacy uses warm tones (`#fbbf24`, `#ef4444`), active-strangling/in-progress uses mid-spectrum (`#f87171`, `#f59e0b`), and freestanding/migrated converges on `#6ee7b7`. This four-stage palette (seed → epiphyte → strangling → freestanding) maps directly to migration states (legacy → in-progress → migrated) and should be reused as-is for any strangler-fig dashboard. Tooltip overlays use absolute positioning relative to the app container (`e.clientX - r.left`) with a rich data card showing species metadata, host identity, and current stage — a pattern portable to any entity-detail hover.

The migration tracker adds a complementary **aggregate progress bar** with a `linear-gradient(90deg, #6ee7b7, #34d399)` fill whose width is `totalProgress / (serviceCount * 100) * 100%`. This gives stakeholders a single at-a-glance metric. The per-service cards use CSS class-driven fill colors (`.legacy .pfill`, `.inprogress .pfill`, `.migrated .pfill`) with transition animations on width, making state changes feel continuous rather than discrete. Reuse this tri-state card grid + aggregate bar layout whenever you need to show both per-component and portfolio-level migration progress.
