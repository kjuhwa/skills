---
name: circuit-breaker-visualization-pattern
description: Three complementary visual metaphors for circuit-breaker state: ring gauge, flow diagram, and time-series timeline.
category: design
triggers:
  - circuit breaker visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# circuit-breaker-visualization-pattern

Circuit-breaker UIs map three states (CLOSED, OPEN, HALF_OPEN) to a consistent color triple — green (#6ee7b7), red (#f87171), yellow (#fbbf24). The **ring gauge** draws a Canvas arc from -PI/2, sweeping `2*PI*ratio` where ratio is `failures/threshold`, with the stroke color reflecting current state. The ring fills clockwise as failures accumulate, giving an instant read on how close the breaker is to tripping. Cards receive a CSS `border-color` transition (0.3s) matching the state color, and a log panel prepends timestamped events capped at ~60 entries to prevent DOM bloat. The **flow diagram** uses SVG with three circles (Client → Breaker → Service) connected by a line that switches to `stroke-dasharray="6,4"` when OPEN, visually "breaking" the circuit. Below the breaker circle, a row of small rectangles acts as a failure gauge — each rect fills red up to the threshold count. A particle system (20 FPS, 50ms interval) spawns circles at the breaker node with random velocity and a 30-frame lifespan, colored red or green per outcome, with opacity decaying as `life/maxLife`. This gives tactile feedback on every request.

The **timeline chart** renders a 120-point scrolling Canvas history. Background bands use the state color at 9% opacity (`color + '18'`), a yellow stroke line plots `failures/threshold` as a normalized Y value, and 4x4 square dots along the bottom mark individual request outcomes (red=fail, green=success, skipped during OPEN). Vertical white lines with state labels mark transition points. A dashed red reference line at the threshold level anchors the viewer's sense of danger. Pre-simulating ~30 ticks before the first render ensures the timeline starts populated rather than empty. All three views share the dark-theme palette (#0f1117 bg, #c9d1d9 text) and avoid external dependencies — pure Canvas 2D and inline SVG only.
