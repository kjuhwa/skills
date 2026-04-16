---
name: bff-pattern-visualization-pattern
description: Left-to-right layered topology rendering for BFF architectures using Canvas/SVG with client-BFF-service color coding.
category: design
triggers:
  - bff pattern visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# bff-pattern-visualization-pattern

BFF pattern visualizations use a three-column left-to-right layout representing the Client → BFF → Microservice request path. Each column is color-coded by role: clients in pink (#f472b6), BFF adapters in teal (#6ee7b7), and backend services in blue (#60a5fa). Nodes are rendered as rounded rectangles with labels, connected by lines or animated particle trails that show request routing. This layered topology makes the "dedicated BFF per client type" principle immediately visible — mobile, web, and IoT clients each route through their own BFF, which fans out to only the relevant subset of backend services.

For animated flow views, use Canvas 2D with `requestAnimationFrame` and a particle system where each particle carries `{ t, from, to, color, next }` and interpolates position along a path at ~0.012 per frame. For metrics dashboards, render rolling-window line charts (50 data points, 800ms tick) on Canvas with gradient fills, where each BFF's latency is simulated via `baseLatency ± jitter` (e.g., Mobile BFF 45ms, Web BFF 30ms, TV BFF 60ms). For interactive topology builders, use SVG with `createElementNS`, mouse-event drag-and-drop on node elements, and link arrays of `{ from, to, el }` that re-render on every drag move.

All three views share a dark theme (#0f1117 background, #c9d1d9 text, Segoe UI font), zero external dependencies, and a single-HTML-file architecture. The consistent color vocabulary across flow, dashboard, and builder views lets users transfer mental models between tools — pink always means client, teal always means BFF adapter, blue always means backend service.
