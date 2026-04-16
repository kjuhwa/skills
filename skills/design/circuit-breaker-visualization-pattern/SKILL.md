---
name: circuit-breaker-visualization-pattern
description: Three-state color-coded visualization for circuit breaker CLOSED/OPEN/HALF-OPEN states with real-time transitions.
category: design
triggers:
  - circuit breaker visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# circuit-breaker-visualization-pattern

Circuit breaker UIs follow a strict three-state color mapping: green (#6ee7b7) for CLOSED (healthy), red (#f87171) for OPEN (tripped), and amber (#fbbf24) for HALF-OPEN (probing recovery). This palette must be applied consistently across all visual elements — node fills, border highlights, status tags, bar charts, and timeline bars. Each state gets both a solid foreground color and a translucent background variant (e.g., `#6ee7b722`) for badges and inactive node fills, creating depth without breaking the semantic mapping.

The pattern supports three complementary view types that each reveal different aspects of the breaker lifecycle. A **dashboard view** renders each service as a card in a responsive grid, showing success rate bars, failure counters relative to threshold (`failures/threshold`), and live state borders. A **state-machine view** uses canvas-drawn nodes connected by labeled arrows (`N failures`, `timeout`, `success`, `failure`) with particle burst animations on transitions to make state changes visually unmistakable. A **timeline view** draws vertical bars above/below a center axis — successes upward in green, failures downward in red, open-state ticks as flat amber lines — with a dashed threshold line for orientation.

All three views share a dark theme (`#0f1117` background, `#1a1d27` cards, `#2a2d37` borders) and update via `setInterval` ticks that drive both the simulation and the render loop. State transitions are surfaced redundantly through color changes, text labels, and an append-to-top event log (`[timestamp] ServiceName → STATE`), ensuring that transient half-open windows are never missed even when they resolve within a single render frame.
