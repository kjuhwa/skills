---
name: finite-state-machine-visualization-pattern
description: Render FSM state diagrams with active-state highlighting, accept-state double circles, and animated transitions using Canvas or SVG.
category: design
triggers:
  - finite state machine visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# finite-state-machine-visualization-pattern

All three FSM apps share a consistent visual grammar for rendering state diagrams. States are drawn as circles (r=26-32px) on a dark background (#1a1d27), with the active state filled in accent green (#6ee7b7) and text color inverted for contrast. Accept (final) states are distinguished by a concentric inner circle (smaller radius, thinner stroke), a convention borrowed from formal automata diagrams. A dedicated start arrow — a short line with an arrowhead — points to the initial state from outside the diagram, making the entry point unambiguous without labels.

Transitions between states use directed edges with arrowhead markers. Straight lines or quadratic Bézier curves connect distinct states, while self-loops use a small arc drawn above or around the node. Each edge carries a label (the input symbol) rendered near the midpoint. When animating a step, the active edge is re-stroked in the accent color and its arrowhead marker switches to a highlighted variant, giving the user a clear trace of which transition just fired. The traffic controller uses SVG with inline `<marker>` defs for arrowheads; the visual simulator uses Canvas with manual trigonometric arrowhead drawing — both achieve the same effect but SVG scales better for dynamic node counts.

Layout positions are stored directly on state objects (`{id, x, y, accept}`), keeping rendering logic stateless — the draw function simply iterates states and transitions each frame. This separation means the same data model drives both the simulation engine and the visualization. To adapt this pattern, define your states with coordinates, your transitions as `{from, to, label}` records, and write a single `render()` function that loops through both collections, styling active elements differently. Add self-loop detection (where `from === to`) as a special branch that draws an arc instead of a line.
