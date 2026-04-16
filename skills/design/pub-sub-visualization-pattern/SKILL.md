---
name: pub-sub-visualization-pattern
description: Canvas-based spatial visualization of pub/sub topic-subscriber topology with animated message delivery particles.
category: design
triggers:
  - pub sub visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# pub-sub-visualization-pattern

Pub/sub systems become intuitive when topics are rendered as anchored focal nodes and subscribers orbit them at varying radii. In the galaxy pattern, each topic is a glowing circle positioned at a fixed coordinate with a distinct color (e.g., orders=green, payments=blue, alerts=gold). Subscribers are small satellite dots that continuously rotate around their topic using angle-based trigonometric positioning (`x = center + cos(angle) * distance`). The orbit speed and distance are randomized per subscriber to prevent visual overlap and convey that subscribers are independent consumers operating at their own pace.

Message delivery is visualized as animated particles that spawn at the topic center and lerp toward each subscriber's current position. The particle's opacity decays over time (`globalAlpha = 1 - t`) and is garbage-collected once fully faded (`filter(p => p.t < 1)`). This creates a "fan-out" visual — one publish triggers N simultaneous particles — which directly maps to the pub/sub broadcast semantic. Clicking a topic node triggers an immediate publish, while a background `setInterval` auto-publishes to random topics, keeping the visualization alive without user interaction.

The color-per-topic convention carries across all three apps: the heartbeat monitor uses it for channel cards with active/inactive states, and the sandbox uses topic-tag chips. When building pub/sub dashboards, assign a stable color to each topic at creation time and propagate that color to every UI element (particles, cards, log entries, progress bars) to give users an instant visual grouping without reading labels.
