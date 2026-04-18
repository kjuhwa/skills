---
version: 0.1.0-draft
name: canvas-trail-fade-vs-clear
description: Use alpha-rect overpaint instead of clearRect for motion-trail visuals; faster and looks better.
category: decision
tags:
  - webaudio
  - auto-loop
---

# canvas-trail-fade-vs-clear

When rendering particle trails, sweeping arcs, or any "comet tail" effect on 2D canvas, the instinct is to `clearRect` then redraw a longer line. Don't. Overpaint the entire canvas with a low-alpha fill (`rgba(bg, 0.05–0.15)`) and then draw current-frame points as opaque dots. The alpha blending naturally fades prior frames into exponential-decay trails with no history buffer, no line-joining math, and no per-particle position history array.

**Why:** We tried `ctx.beginPath(); moveTo(prev); lineTo(curr); stroke()` with stored prev positions first — cost was 3× the render time at 5k particles and required bookkeeping for wraparound (lines jumped across the screen on edge wrap). The overpaint approach sidesteps both.

**How to apply:** Default to overpaint for any >500-particle system with visible motion. Tune alpha: 0.05 for long ghostly trails, 0.12 for short crisp ones. Caveat — it's incompatible with truly transparent canvases (the fade color becomes the de facto background), and on very dark themes pick a fade color slightly lighter than pure black so trails don't turn into permanent burn-in.
