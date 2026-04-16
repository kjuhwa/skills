---
name: hexagonal-architecture-visualization-pattern
description: Three-ring concentric hexagon layout with layer-coded nodes, inward-flow edges, and polar positioning for domain/port/adapter components.
category: design
triggers:
  - hexagonal architecture visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# hexagonal-architecture-visualization-pattern

The canonical hexagonal architecture visualization uses three concentric flat-top hexagons rendered inside-out (outermost first for correct z-order). Each ring maps to a layer — Domain Core (innermost, green #6ee7b7, radius ~70-80px), Ports (middle, blue #3b82f6, radius ~140-150px), Adapters (outermost, orange #f97316, radius ~220-240px). Hexagon vertices are computed via `Math.PI/6 + i * Math.PI/3` for flat-top orientation. Rings use semi-transparent fills (`color + '10'` to `'18'`) with solid strokes, and layer labels are anchored at the top of each ring (`cy - r + offset`). This three-color, three-ring encoding is the visual primitive shared across all hex-arch tools — flow simulators, builders, and dependency maps alike.

Nodes (entities, ports, adapters) are placed using polar coordinates: each node stores a `layer` index (selecting a radius) and an `angle` (radians), then resolves to `(cx + r*cos(a), cy + r*sin(a))`. This keeps components on their correct ring without manual x/y layout. Edges between nodes are drawn as lines or directed arrows connecting source and target positions, with highlight-on-hover revealing dependency chains. Interactive behaviors vary by purpose: click-to-fire particle animations for flow simulation (particles interpolate from adapter position toward center with fading opacity), drag-and-drop for layer-builder placement, and mouseover-triggered edge highlighting for dependency mapping.

The visual style is consistently dark-themed (#0f1117 background, #1a1d27 surfaces, rounded containers) with monospace log panels for event traces. Both Canvas 2D and SVG renderers work — Canvas suits animation-heavy flows (requestAnimationFrame loops with particle arrays), while SVG suits static or drag-drop interactive layouts where DOM event delegation is simpler. The key invariant is that all visual flow arrows and particle animations move **inward** (adapter → port → domain), reinforcing the Dependency Rule that outer layers depend on inner layers, never the reverse.
