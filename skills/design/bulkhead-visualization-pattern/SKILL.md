---
name: bulkhead-visualization-pattern
description: Reusable visual encoding patterns for rendering bulkhead compartmentalization, breach propagation, and structural integrity in canvas/SVG.
category: design
triggers:
  - bulkhead visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# bulkhead-visualization-pattern

Bulkhead visualizations share a three-layer rendering model: hull boundary, partition walls, and compartment state fills. The hull is drawn as a bounded rectangle (canvas `strokeRect`) or an SVG `path` with quadratic-curve endpoints to suggest a ship cross-section. Partition walls use a distinct accent color (`#6ee7b7` teal) at higher line-width or as draggable `rect` elements, visually separating compartments. Compartment state is encoded through semi-transparent overlays — `rgba(30,100,200,0.45)` for water/flood level rising from the floor, `rgba(255,80,80,0.15)` for breach highlighting, and `rgba(110,231,183,0.08)` vs `rgba(255,80,80,0.12)` for integrity-pass vs integrity-fail sections. This layered fill approach lets multiple states (breached + flooding) composite without z-fighting.

For software-domain bulkhead dashboards (thread pool isolation), the pattern shifts to per-pool cards containing a percentage progress bar, individual slot indicators (active/inactive dots), and a color-coded degradation threshold. When utilization exceeds 85%, the bar color flips from the pool's identity color to a warning red (`#ff6b6b`) and a CSS class `.degraded` applies a red border glow. A prepend-only event log with timestamps provides temporal context. This card-per-pool layout directly mirrors the bulkhead metaphor: each service is visually isolated, and one pool going red does not affect the visual state of its neighbors.

For interactive builder tools, SVG drag-and-drop on wall positions lets users explore placement. Section widths are labeled dynamically at each section's midpoint. Structural tests overlay green/red section fills using a variance-from-ideal metric: sections wider than 1.5× the ideal width are flagged red. The integrity score formula `max(0, 100 - variance/2)` maps mean absolute deviation from equal spacing to a 0–100% scale. This encode-test-highlight cycle (draw → compute → overlay result) is reusable for any partition-optimization UI.
