---
name: finite-state-machine-visualization-pattern
description: Circular-node state graph with directional arrows, active-state glow, and dark-theme FSM rendering on Canvas/SVG.
category: design
triggers:
  - finite state machine visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# finite-state-machine-visualization-pattern

All three FSM apps converge on the same visual vocabulary: states are circles (r=26–30px) arranged either radially (visual-simulator uses `2π/n` polar layout) or linearly (regex-tester spaces nodes evenly across width), with the active state rendered using a green glow (`#6ee7b7` stroke + `#6ee7b733` fill) against a dark background (`#1a1d27` node fill, `#2d333b` default stroke). Transitions are directional arrows drawn by computing a unit vector `(ux, uy)` between source and target, offsetting start/end by the node radius to avoid overlap, and capping with a triangular arrowhead (3-point polygon at `refX - ux*8`). Self-loops—critical for Kleene-star patterns—require special-case bezier curves (`C` path with control points 40–75px above the node). Edge labels sit at the midpoint of the line or above the self-loop apex.

The pattern supports two rendering backends interchangeably: Canvas 2D (visual-simulator, state-designer) using `arc()`/`moveTo()`/`lineTo()`, and SVG DOM (regex-tester) using `<circle>`, `<line>`, and `<path>` elements with an SVG `<marker>` definition for arrowheads. The Canvas approach is better for drag-and-drop interactivity (hit-testing via `Math.hypot()`), while SVG is better for step-through animation where individual elements need class-based styling (`.state-active`, `.state-accept`). Both share the same unit-vector arrow math, making the geometry code directly portable between backends.

For interactive designers, layer a mode-state-machine on top of the FSM display: an `mode` variable cycles through `idle → place-state → trans-from → trans-to → idle`, with `canvas.onmousedown` dispatching to different handlers per mode. State dragging uses `onmousemove` to update `(x, y)` and redraw. The simulation toggle swaps between design mode (draggable, editable) and run mode (click-to-set-current-state, outgoing transitions displayed), reusing the same draw loop with a `simMode` boolean controlling highlight behavior.
