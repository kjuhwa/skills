---
name: outbox-pattern-visualization-pattern
description: Three complementary visual encodings for outbox relay pipelines — lane flow, dashboard metrics, and SVG node graph with animated message lifecycle.
category: design
triggers:
  - outbox pattern visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# outbox-pattern-visualization-pattern

The outbox pattern demands visualization at three abstraction levels. **Lane-based flow** renders the Service DB → Outbox Table → Message Broker pipeline as horizontal swim lanes using flexbox (`display:flex; gap:0`) with equal flex distribution. Each message appears as a card with `.id` and `.meta` sections, transitioning between lanes via timed DOM moves (300ms write latency, 500ms poll latency). A `.processing` CSS class applies a glowing border (`box-shadow:0 0 8px #6ee7b744`) to the item being polled, preventing visual ambiguity about which message the relay is currently handling. Canvas particle effects (`requestAnimationFrame` loop, 6 particles per event with random velocity and life decay at 0.02/frame) provide visceral feedback when messages cross lane boundaries.

**Dashboard-level metrics** use a CSS Grid layout with four stat cards (Produced, Delivered, Pending, Failed) feeding a rolling 30-point throughput line chart. The chart renders on canvas with dynamic Y-axis scaling (`max = Math.max(...history)`) and a filled area under the curve (`rgba(110,231,183,0.08)`). A queue panel shows pending/completed items with status badges, capped at 10 completed entries to prevent DOM bloat. An event log prepends timestamped entries (`[WRITE]`, `[POLL]`, `[ERROR]` tags) with a 50-entry cap via `lastChild.remove()`. This level answers operational questions: Is throughput stable? Are failures spiking? Is the queue draining?

**SVG node-graph animation** positions four circles (Service, DB+Outbox, Relay, Broker) at fixed coordinates and animates message dots along connecting edges using parametric interpolation (`t: 0→1`). A sine-wave Y-offset (`Math.sin(t*Math.PI)*-20`) creates an arc effect during transit. Message lifecycle maps to color: green (in-flight) → red (failed at relay) → yellow (retrying) → green (delivered). Failed messages animate only the partial path (Service→DB→Relay), then spawn a retry dot from Relay→Broker after 500ms. Speed and failure-rate sliders allow real-time parameter tuning. All three levels share a dark theme (#0f1117 background, #6ee7b7 emerald accents, #1a1d27 card surfaces) for visual cohesion.
