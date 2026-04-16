---
name: hexagonal-architecture-visualization-pattern
description: Canvas/SVG-based rendering of concentric hexagonal layers with port-adapter connectors and animated request particles for hexagonal architecture diagrams.
category: design
triggers:
  - hexagonal architecture visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# hexagonal-architecture-visualization-pattern

The core visualization pattern renders hexagonal architecture as nested hexagon polygons on a canvas or SVG surface. A `hexPoint(cx, cy, r, i)` function computes vertices using `Math.PI / 3 * i - Math.PI / 6` rotation, producing flat-top hexagons. The innermost hexagon represents the Domain Core (entities, aggregates), surrounded by concentric rings for use-cases, ports, and adapters — each ring drawn at `baseRadius + layerIndex * spacing`. Layers are color-coded by role: driving ports (#6ee7b7 green), driven ports (#f59e0b amber), adapters (#3b82f6 blue / #8b5cf6 violet), and domain entities (#ec4899 pink). Ports are positioned on the hexagon perimeter at angles corresponding to their type (driving on the left semicircle at π to 1.2π, driven on the right at 0 to -0.3π), and adapters are placed at `radius + 70px` outward along the same angle with connecting lines.

Interactive composition is achieved through a drag-and-drop palette of typed components (`driving-adapter`, `driving-port`, `use-case`, `entity`, `driven-port`, `driven-adapter`) that stack into an ordered layer list. Each drop triggers a full re-render where layers are iterated in reverse so outer rings draw first. The SVG variant creates `<polygon>` elements with `hexPoints()` and labels via `<text>` nodes anchored to `cy - r + 16` to sit atop each ring. A description map keyed by layer type provides contextual explanations (e.g., "Interfaces the domain defines for outgoing needs" for driven-port). This palette-stack-diagram triad — where the palette defines available components, the stack defines composition order, and the diagram reflects the stack in real time — is the reusable structural pattern for any hexagonal architecture visualizer.

Request-flow animation overlays particle objects `{ sx, sy, ex, ey, t }` that interpolate linearly from a driving adapter through the domain center to a driven adapter. The particle's alpha fades as `1 - t` to visually indicate traversal progress. A staggered `setTimeout` (600ms) separates the inbound leg (adapter → core) from the outbound leg (core → driven adapter), reinforcing the dependency rule that the domain never initiates outward calls. An event log (`prepend` for newest-first) timestamps each simulated request with the path taken, providing a textual audit trail alongside the visual animation.
