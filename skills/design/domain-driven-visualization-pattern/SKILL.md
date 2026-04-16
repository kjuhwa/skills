---
name: domain-driven-visualization-pattern
description: Canvas and SVG rendering patterns for interactive DDD strategic and tactical model exploration
category: design
triggers:
  - domain driven visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# domain-driven-visualization-pattern

All three apps share a dark-theme visual language (#0f1117 background, #1a1d27 surfaces, #6ee7b7 accent) with a consistent DDD color encoding: green (#6ee7b7) for aggregates/roots, blue (#3b82f6) for entities/commands, amber (#f59e0b) for value objects/domain events, purple (#c084fc) for policies, and red (#ef4444) for invariants/conformist relationships. This palette maps directly to DDD building blocks so that users build visual intuition — strategic concepts (bounded contexts, relationships) use SVG with dashed circles and arrowed lines, while tactical concepts (aggregate internals) use Canvas2D with radial layouts emanating from the aggregate root. Event storming uses DOM-based colored sticky notes positioned absolutely on a grid background.

The interaction model follows a three-tier pattern: (1) **Context Map** uses SVG node-and-edge dragging where bounded contexts are circles connected by typed relationship lines (Partnership, Customer-Supplier, ACL, Shared Kernel, Published Language, Conformist) — clicking a line reveals the relationship type in a toast panel; (2) **Event Storm** uses a drag-from-palette-to-board metaphor where color-coded sticky notes (command → event → policy chains) can be repositioned and double-click-edited, with chip-based palette buttons using HTML drag-and-drop API; (3) **Aggregate Explorer** uses a sidebar list-detail pattern where selecting an aggregate renders a Canvas radial diagram — root at center, entities on solid lines in an upper arc, value objects on dashed lines in a lower arc, invariants listed as warning text at the bottom. Each app keeps all domain data in a single top-level array of plain objects, re-rendering the full scene on every interaction (full-redraw-on-mutation pattern), which keeps state management trivial at the cost of performance on very large models.

The reusable skeleton for any DDD visualization is: define a typed domain data array, assign each DDD concept a distinct hue, pick SVG for relational graphs or Canvas for hierarchical/radial diagrams or DOM for free-form spatial layouts, wire mousedown/mousemove/mouseup for drag, and render a detail panel (toast, sidebar, or overlay) on click. Invariants and constraints should always be surfaced visually (warning icons, red text) rather than hidden in tooltips, because making rules visible is the whole point of a DDD exploration tool.
