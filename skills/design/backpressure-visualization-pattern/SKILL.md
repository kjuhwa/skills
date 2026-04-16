---
name: backpressure-visualization-pattern
description: Visual pattern for rendering producer-consumer flow imbalance with buffer saturation and drop indicators
category: design
triggers:
  - backpressure visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# backpressure-visualization-pattern

Backpressure visualizations need three synchronized visual layers: (1) a **flow channel** showing item tokens moving from producer to consumer at distinct rates, (2) a **buffer/queue reservoir** rendered as a fillable container (tank, pipe segment, or stacked cells) whose fill level maps directly to queue depth, and (3) **pressure indicators** (color gradient from green→yellow→red, or pulsing borders) that activate when fill crosses watermark thresholds (e.g., 60%, 85%, 100%). The producer node should visibly slow, pause, or emit "throttled" particles when downstream signals saturation—this is the single most important visual cue that distinguishes backpressure from simple buffering.

Use an **overflow affordance** to show what happens when the buffer is breached: dropped items fall off-canvas with a fade, get rerouted to a dead-letter lane, or trigger a "shed" animation. Pair this with a small telemetry panel (items/sec in, items/sec out, queue depth, drops) so the user can correlate the animation with numeric state. Time-series sparklines for in-rate vs. out-rate are highly effective because the visual gap between the two lines *is* the backpressure story.

Keep the producer and consumer on opposite sides with a horizontal channel between them (reads as a "pipe" metaphor natively). Avoid vertical or diagonal flows for the primary channel—they make rate comparison harder. Interactive controls must include: producer rate slider, consumer rate slider, buffer capacity, and a strategy selector (block, drop-oldest, drop-newest, sample). Changes should animate smoothly rather than snap, so cause-and-effect is visible.
