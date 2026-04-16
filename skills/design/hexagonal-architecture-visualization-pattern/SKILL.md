---
name: hexagonal-architecture-visualization-pattern
description: Concentric hexagonal ring rendering with interactive layer/module exploration for ports-and-adapters topology.
category: design
triggers:
  - hexagonal architecture visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# hexagonal-architecture-visualization-pattern

All three hexagonal architecture apps share a core visual idiom: concentric hexagonal rings drawn programmatically via a `hexPoints`/`hexPath` helper that computes 6 vertices at `Math.PI/3` intervals offset by `-Math.PI/6` (flat-top orientation). The innermost ring represents the Domain Core (colored `#fbbf24` gold), surrounded by Application Services / Ports (`#6ee7b7` green), then Adapters (`#60a5fa` blue), and optionally Infrastructure (`#a78bfa` purple). Each ring is rendered back-to-front with semi-transparent fills (`color + '15'`) that brighten on hover/selection (`color + '33'`), producing a layered depth effect against a dark `#0f1117` / `#1a1d27` background. Stroke width increases from 1.5 to 3 for the active layer, creating a clear focus indicator without redrawing the entire topology.

Interactivity follows two complementary patterns: **hover-to-explore** (Layer Explorer uses `mousemove` with a hex-radius hit-test that divides point distance by a sector cosine factor to map pixel coordinates onto hexagonal rings) and **click-to-trace** (Dependency Flow places circular module nodes at angular positions along rings via `2π * slot / count` and draws directed arrows with arrowhead triangles between them). When a module is selected, only its direct dependency edges highlight in green while illegal outward-pointing dependencies could flash red (`#ef4444`). A companion detail panel (sidebar or bottom bar) displays the selected element's metadata — description, contained items, or dependency list — keeping the hex diagram uncluttered.

The Port & Adapter Simulator adds a **message-flow animation** layer: a small colored dot (`circle` element) interpolates from a port node toward the domain center using `requestAnimationFrame`, with `t += 0.025` per frame. On arrival, a log entry is prepended to a scrollable event log panel styled with directional color coding (green for inbound, gold for core processing, blue for outbound). Ports are positioned at `R + 60` from center along fixed angles, connected to the hex boundary by dashed lines (`stroke-dasharray: 4`). This pattern of animating a token along a port→core→port path is reusable for any message-flow or request-lifecycle visualization in hexagonal contexts.
