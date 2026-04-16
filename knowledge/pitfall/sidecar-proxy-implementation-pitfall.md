---
name: sidecar-proxy-implementation-pitfall
description: Common rendering, simulation, and state management mistakes when building sidecar proxy visualizations.
category: pitfall
tags:
  - sidecar
  - auto-loop
---

# sidecar-proxy-implementation-pitfall

The most dangerous pitfall is particle lifecycle leaks in the traffic flow animation. Each request particle must be spliced from the array after completing its journey (forwarded) or fade-out (blocked), but the removal must iterate backwards (`for(let i=particles.length-1; i>=0; i--)`) to avoid index-shift bugs when removing mid-loop. If particles are not cleaned up, the array grows unbounded during flood simulations and the canvas render loop degrades from 60fps to stuttering within minutes. A related issue is forgetting to reset `globalAlpha` after drawing fading blocked particles — leaving it below 1.0 causes all subsequent draws in the frame to be semi-transparent, creating a ghost-trail visual bug that is difficult to diagnose because it depends on draw order.

The dashboard's rolling time-series chart has a subtle data-window pitfall: the `latencyData` array must be capped with `shift()` when exceeding `maxPoints`, but the SVG polyline x-coordinates are calculated as `i * (width / (maxPoints - 1))`, which assumes the array is always at max length. When the array is still filling up (first 30 ticks), points cluster on the left side of the chart, creating a misleading compressed-time view. The fix is to compute x-spacing based on `latencyData.length` instead of `maxPoints`, or to pre-fill the array with zeros. Similarly, the status-code bar chart divides by `reduce(..., 1)` (starting at 1, not 0) to avoid division-by-zero on first render, but this off-by-one means the initial percentages are slightly wrong — acceptable for a live dashboard but incorrect for snapshot exports.

The topology view's biggest pitfall is SVG innerHTML replacement on every render. Calling `svg.innerHTML = html` destroys and recreates all DOM nodes, which breaks any in-progress CSS transitions and forces the browser to re-parse the entire SVG tree. For the initial static render this is fine, but if you add features like node dragging or hover effects, the innerHTML approach must be replaced with targeted DOM updates (setAttribute on existing elements). The animated edge dashoffset also has a subtle timing issue: using `Date.now() / 40 % 8` for offset creates smooth animation but couples animation speed to system clock rather than frame delta, so it runs identically fast on 30fps and 144fps monitors — which is actually desirable for consistency but can cause tearing if the modulo period doesn't align with the dash pattern length.
