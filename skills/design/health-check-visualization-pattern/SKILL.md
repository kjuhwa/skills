---
name: health-check-visualization-pattern
description: Three-state service health dashboard with consistent color semantics and interactive drill-down
category: design
triggers:
  - health check visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# health-check-visualization-pattern

Health check visualizations converge on a three-state model (up / degraded / down) mapped to a strict color triad: green (#6ee7b7) for healthy, amber (#fbbf24) for degraded, and red (#f87171) for down. This palette is applied consistently across card dots (Pulse), orbital nodes (Orbit), and heatmap cells (Matrix). The dark background (#0f1117) with card surfaces (#1a1d27) ensures the status colors pop without competing chrome. Each app renders multiple services simultaneously so operators can spot the one outlier among many healthy nodes — the visual weight of red or amber against a sea of green is the primary signal.

The three apps demonstrate three complementary layout strategies for the same data: a card grid with sparkline timeline for latency-focused monitoring, a radial orbit for topology-aware views that encode core vs. edge service rings, and a service-by-time heatmap matrix for historical pattern recognition. All three share an interaction pattern where hover or click on a service reveals contextual detail (latency value, health percentage, or hourly status) in a tooltip or info panel rather than overloading the primary view. Node sizing in Orbit scales with health percentage (10-20px radius), making sick services physically smaller and visually recessive — a deliberate design inversion where "less healthy" means "less visible" to avoid alarm fatigue while still surfacing zero-health nodes via opacity dimming.

To reuse this pattern: define your service list as an array of `{ name, status, metric }` objects, choose one of the three layout strategies based on whether your priority is latency trends (grid+timeline), topology awareness (orbit rings), or historical coverage (heatmap), and wire up the three-color mapping as a single `colors` lookup table. Keep the drill-down interaction lightweight — inline tooltip or sidebar panel — so the primary multi-service view stays uncluttered.
