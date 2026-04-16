---
name: message-queue-visualization-pattern
description: Animated producer-queue-consumer flow rendering with canvas particles and real-time queue depth indicators.
category: design
triggers:
  - message queue visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# message-queue-visualization-pattern

The core visualization pattern for message queues centers on a three-lane layout: a producer zone on the left, a central queue buffer rendered as a dashed-stroke container, and a consumer zone on the right. Messages are drawn as small colored circles (8px radius) that animate toward slot positions inside the queue using eased interpolation (`x += (targetX - x) * 0.08`). When a message is consumed, it transitions rightward with fading alpha (`alpha *= 0.995`) and spawns 8 burst particles with random velocity vectors (`vx/vy = (Math.random() - 0.5) * 4`) that decay over 40 frames. This particle-on-consume pattern gives immediate visual feedback that a message was processed, not just removed.

For multi-queue monitoring views, each queue is rendered as a card with a horizontal fill bar whose color shifts across three thresholds: green (`#6ee7b7`) below 50% capacity, yellow (`#facc15`) at 50-80%, and red (`#ef4444`) above 80%. The bar uses CSS `transition: width 0.5s` for smooth depth changes. Summary stats (total depth, produced count, consumed count, error count) sit above the grid in a flex row of metric cards. The tick loop runs at 1-second intervals, adding random produce/consume deltas (`Math.floor(Math.random() * 15)` produce, `* 18` consume) clamped to `[0, maxSize]`, with a 3% per-tick error probability to simulate realistic queue behavior.

A key reusable detail: the queue count badge and live-pulse indicator (CSS `@keyframes pulse` on a red "LIVE" dot) provide at-a-glance operational status. The color palette (`#0f1117` background, `#1a1d27` cards, `#6ee7b7` accent) with `system-ui` font creates a dark-mode ops dashboard feel that works across all three app variants without any framework dependency — pure canvas for flow animation, pure DOM for monitoring grids.
