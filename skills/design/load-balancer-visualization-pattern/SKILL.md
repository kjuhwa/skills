---
name: load-balancer-visualization-pattern
description: Canvas/SVG visualization layout for rendering load balancer request flow across backend pool
category: design
triggers:
  - load balancer visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# load-balancer-visualization-pattern

Structure the UI as three stacked zones: (1) an incoming request stream on the left showing queued requests with unique IDs and timestamps, (2) a central load balancer node that highlights the currently selected algorithm (round-robin, least-connections, weighted, IP-hash, random), and (3) a backend server pool on the right rendered as cards displaying live metrics — active connections, CPU%, response time, health status, and weight. Animate each request as a moving dot that travels from source → LB → chosen backend, with the path color-coded by algorithm decision reason.

Use a consistent server-card schema across all three apps: `{id, weight, activeConns, cpu, healthy, responseTime, totalHandled}`. Render unhealthy servers with greyed-out styling and a strike-through to make health-check failures visually obvious. Overlay a per-server "load bar" that fills proportionally to activeConns/capacity so imbalances jump out. For algorithm-race-lab specifically, split the canvas into parallel lanes — one per algorithm — fed from the same request stream so users can directly compare distribution outcomes side-by-side.

Anchor decision logging to a scrolling sidebar showing the last N routing decisions with format `[t+Xms] req#42 → server-3 (reason: lowest conns=2)`. This pairing of spatial animation + textual decision trace is what turns the visualization from eye-candy into a teaching tool.
