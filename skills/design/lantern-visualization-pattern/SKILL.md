---
name: lantern-visualization-pattern
description: Canvas-based lantern rendering with glow, flicker, and ascent physics for festival-style UIs
category: design
triggers:
  - lantern visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# lantern-visualization-pattern

Lantern visualizations share a three-layer compositing approach: a dark gradient sky backdrop, a radial-gradient glow halo rendered with `globalCompositeOperation = 'lighter'`, and a paper-body silhouette with subtle bamboo-rib strokes. Each lantern instance carries `{x, y, vy, hue, phase, radius}` state, where `phase` drives a sine-based flicker on both the inner flame alpha (0.6–1.0) and the halo radius (±8%). Hues stay within the warm 15°–45° HSL band so the scene reads as candle-lit regardless of individual color jitter.

For the lantern-festival mural view, ascent is modeled as `y -= vy + windField(x, t)` where `windField` is a cheap 2D sin/cos lattice — this gives the lazy drift that distinguishes lanterns from generic particles. The lantern-explorer map view instead pins lanterns to geo-coordinates and only animates the flicker and halo, while lantern-cipher reuses the same body sprite as a glyph-carrier, swapping the flame for a character glyph rendered in the same warm-glow palette. The shared primitive is a `drawLantern(ctx, lantern, mode)` function where `mode ∈ {'float','pinned','glyph'}` selects which sub-layers render.

Key reusable decisions: render at `devicePixelRatio` with an offscreen canvas for the halo pass (halos dominate paint cost — cache one per hue), clamp lantern count by viewport area (~1 lantern per 8000 px² before FPS collapses on mid-tier laptops), and always draw back-to-front by `y` so overlapping halos additively brighten rather than z-fight. The flicker phase should be seeded per-lantern, never global, or the whole scene pulses in unison and looks mechanical.
