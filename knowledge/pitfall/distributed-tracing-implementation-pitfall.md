---
name: distributed-tracing-implementation-pitfall
description: Common mistakes when building distributed trace visualizations — broken time-axis math, missing containment invariants, and tooltip hit-testing edge cases.
category: pitfall
tags:
  - distributed
  - auto-loop
---

# distributed-tracing-implementation-pitfall

The most frequent bug in trace waterfall views is **time-axis normalization against the wrong denominator**. If you normalize span positions against `totalMs` (the trace's expected duration) instead of `maxEnd` (the actual rightmost span edge, computed as `Math.max(...spans.map(s => s.start + s.dur))`), spans with jittered start times or durations that overshoot the nominal window will render beyond 100% width, causing horizontal overflow or clipped bars. The waterfall app correctly uses `maxEnd` rather than `totalMs` — but the flame chart uses `totalMs` directly, which works only because its recursive generator enforces the containment invariant. If you ever mix flat-generated spans with the flame chart renderer, you'll get overflow. Always normalize against the observed maximum, not the generation parameter.

The second pitfall is **broken parent-child containment in flame charts**. The recursive tree generator prevents children from exceeding parent bounds with an explicit cursor check, but if you add network delay simulation (e.g., spans that start after the parent ends to model async callbacks), the `depth`-based y-stacking breaks visually — a child rect will appear below its parent but extend beyond the parent's horizontal bounds, implying a containment that doesn't exist. Real tracing systems (Jaeger, Zipkin) solve this by linking spans via `parentSpanId` and rendering connectors, not relying on depth alone. Any simulation that introduces async gaps or follow-from semantics needs explicit parent-child edge rendering rather than pure depth stacking.

The third pitfall is **Canvas hit-testing precision on topology views**. The `hypot(dx, dy) < node.r` check works for circular nodes, but when the graph is dense and nodes overlap (common at 10+ services), the first-match (`Array.find`) returns whichever node was defined first in the array, not the one visually on top (drawn last). The fix is to iterate nodes in reverse draw order for hit testing. Additionally, the particle animation uses `splice(i, 1)` inside a reverse loop — if you refactor to a forward loop, the index shifts cause particles to be skipped. These Canvas-specific ordering issues don't appear in DOM/SVG-based renderers where z-index and event bubbling handle overlap naturally.
