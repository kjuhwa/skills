---
name: hexagonal-architecture-data-simulation
description: Structured node-edge-layer data model for simulating request flows, component placement, and dependency graphs in hexagonal architectures.
category: workflow
triggers:
  - hexagonal architecture data simulation
tags:
  - auto-loop
version: 1.0.0
---

# hexagonal-architecture-data-simulation

The data model for hexagonal architecture simulation centers on a three-tier layer array defining concentric ring metadata — each entry carries a `name`/`label`, a `radius` (pixel distance from center), and a `color`. This array is the single source of truth for rendering and for validating which layer a component belongs to. Components/nodes are defined as objects with an `id`, a `layer` index (0=domain, 1=port, 2=adapter), an `angle` in radians for polar positioning, and a human-readable `label`. Edges are minimal `[sourceId, targetId]` tuples encoding dependency direction. This structure supports three simulation modes: flow simulation (spawn particles at adapter nodes and animate them inward through port to domain), interactive building (drag typed chips onto the canvas and snap to the correct ring), and dependency mapping (traverse edges from any hovered node to compute `dependsOn` and `dependedBy` sets).

Flow simulation manages a `particles` array where each particle tracks `{sx, sy, t}` — start position and interpolation factor. On each animation frame, `t` increments by a fixed step (~0.012), position interpolates linearly from source toward center, and opacity fades as `1 - t`. Particles are filtered out when `t > 1`. Events are logged with timestamps in a scrollable monospace panel, encoding the traversal path as `AdapterName → Port → Domain Core`. For dependency mapping, edge traversal computes forward dependencies (`edges.filter(e => e[0] === nodeId).map(e => e[1])`) and reverse dependencies (`edges.filter(e => e[1] === nodeId).map(e => e[0])`), displayed in a detail panel on hover. Layer-builder mode uses HTML5 drag-and-drop: chips fire `dragstart` with serialized component data, the SVG board handles `drop` to resolve cursor position into SVG coordinates (accounting for viewBox scaling), and components are stored in a `placed[]` array with click-to-remove.

The key simulation rule is **directional integrity**: adapter-to-port and port-to-domain edges are valid; domain-to-adapter edges are violations. Edge data should be validated at construction time to enforce the Dependency Rule. Color mapping (`{ domain: '#6ee7b7', port: '#3b82f6', adapter: '#f97316' }`) is shared across all modes and should be defined once as a constant lookup rather than repeated per component.
