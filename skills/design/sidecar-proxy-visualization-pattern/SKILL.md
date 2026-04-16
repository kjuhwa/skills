---
name: sidecar-proxy-visualization-pattern
description: Render sidecar proxy network topology and traffic flow using canvas/SVG with node-edge graphs and animated particle trails.
category: design
triggers:
  - sidecar proxy visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# sidecar-proxy-visualization-pattern

Sidecar proxy visualizations require a three-layer rendering approach: infrastructure nodes (clients, proxies, services), connection edges (dashed lines representing network hops), and animated traffic particles that travel along those edges. Nodes are drawn as labeled circles with a consistent color convention — neutral gray for clients, green (#6ee7b7) for sidecar proxies, blue (#58a6ff) for backend services, orange for warnings, and red (#f85149) for blocked/failed requests. Each sidecar is rendered as a small satellite circle ("SP" badge) attached to its parent service node, visually encoding the co-located deployment relationship that defines the sidecar pattern.

The topology view uses an SVG node-edge graph where services are positioned in tiered rows (gateway → services → infrastructure) with dashed, animated stroke-dashoffset edges to convey active traffic. Clicking a node opens an inspector panel displaying that service's sidecar configuration — upstream proxy type (envoy vs tcp-proxy), mTLS status, retry count, timeout, circuit-breaker threshold, and rate limits. This click-to-inspect pattern lets users understand per-service proxy policy without cluttering the overview. The traffic-flow view complements this with a canvas-based particle system where each request is a dot that moves through phases: client→sidecar (phase 0), sidecar→service (phase 1), or rejected/fade-out (phase 2 for blocked traffic). Particles use `requestAnimationFrame` for smooth 60fps animation and are removed after completing their lifecycle.

A companion dashboard view provides real-time operational metrics: a rolling SVG polyline chart for latency, a large-number RPS counter, horizontal bar charts for HTTP status code distribution (200/201/404/500), and a scrolling proxy access log showing method, path, status, and latency per request. All three views share the same dark theme (#0f1117 background) and color palette, creating a cohesive monitoring experience. The dashboard uses `setInterval`-based ticking (800ms) for metric updates, while flow and topology views use `requestAnimationFrame` for visual animation — matching the update cadence to the type of data being shown.
