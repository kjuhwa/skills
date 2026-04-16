---
name: connection-pool-visualization-pattern
description: Three complementary visual encodings for connection-pool state — time-series canvas chart, SVG bubble grid, and swimlane lifecycle cards.
category: design
triggers:
  - connection pool visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# connection-pool-visualization-pattern

Connection pools have three natural visualization axes, each suited to a different rendering technique. **Time-series monitoring** uses an HTML Canvas 2D line chart with a fixed-length history buffer (e.g., 80 points at 400ms ticks). Three color-coded lines — active (#6ee7b7), idle (#3b82f6), waiting (#f87171) — scroll left as new samples push in. Pair the chart with large numeric stat boxes for at-a-glance current values. Scale the Y-axis to `maxPool × 1.5` so demand overflow (waiting queue) remains visible without clipping. This view answers "how is the pool trending over the last 30 seconds?"

**State-grid bubbles** render each connection as an SVG circle in an `N-column × M-row` grid, filled by state color with a CSS `fill` transition (0.3s). Clicking a bubble toggles its state; an auto-release timer (2–5 s random uniform) returns it to idle, simulating real connection timeouts. An event log below the grid timestamps every acquire/release. This view answers "which specific connections are busy right now?" and is ideal for pools ≤ 20 where per-connection identity matters.

**Swimlane lifecycle cards** divide the screen into vertical lanes — Idle | Active | Closing — and render each connection as a card showing its ID and age in seconds (elapsed from `born: Date.now()`). Cards carry a colored left-border matching their lane and fade to 60 % opacity during the closing phase. A 500ms render loop recomputes ages and repositions cards. This view answers "how long has each connection lived and where is it in the lifecycle?" It uniquely surfaces the closing/cleanup phase that the other two views omit.
