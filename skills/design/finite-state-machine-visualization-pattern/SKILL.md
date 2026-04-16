---
name: finite-state-machine-visualization-pattern
description: Canvas/SVG graph rendering of FSM states as circles and transitions as directed arrows with active-state highlighting.
category: design
triggers:
  - finite state machine visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# finite-state-machine-visualization-pattern

All three FSM apps share a consistent visualization pattern: states are rendered as circles at fixed x/y coordinates, and transitions are drawn as directed arrows between them. The active (current) state is highlighted with a brighter stroke, a tinted fill (`#6ee7b733`), and bolder text, while inactive states use muted colors (`#444`, `#333`). Arrows use unit-vector math to offset start/end points from circle edges (`radius ± 26-30px`), and arrowheads are drawn as small triangles using `atan2`-based rotation. Transition labels are placed at the midpoint of each arrow, offset perpendicular to the line direction via the normal vector (`uy*12, -ux*12`). Self-loop transitions (as in fsm-regex-matcher) are rendered as small arcs above the node.

The pattern works on both Canvas 2D (fsm-playground, fsm-regex-matcher) and SVG (fsm-traffic-sim) with identical visual logic. State positions are stored in a simple `{id: {x, y}}` map separate from transition logic, enabling layout changes without touching the state machine definition. Accept states (regex-matcher) add a concentric inner circle as a double-ring indicator. The key reusable insight is that the FSM graph is redrawn from scratch on every state change — no incremental DOM diffing — which keeps rendering stateless and trivially correct. Active transitions are determined by matching `from === currentState`, giving immediate visual feedback on which outbound edges are "live."

To reuse this pattern: define a `positions` map alongside your `transitions` array, write a single `draw()` function that clears and repaints all nodes and edges with active/inactive styling, and call it after every state change. Swap Canvas for SVG (or vice versa) without changing the data model — only the rendering primitives differ.
