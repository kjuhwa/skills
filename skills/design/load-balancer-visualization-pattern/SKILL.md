---
name: load-balancer-visualization-pattern
description: Canvas-based real-time visualization pattern for load balancer state, traffic flow, and backend health across algorithms
category: design
triggers:
  - load balancer visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# load-balancer-visualization-pattern

Load balancer visualizations need three synchronized layers rendered on the same canvas/SVG surface: a topology layer (client pool → LB node → backend servers arranged radially or in columns), a traffic layer (animated request packets traveling along edges with easing curves), and a state overlay layer (per-backend connection counts, CPU/latency gauges, health status rings). Each backend node should expose four visual channels — fill color for health (green/yellow/red), ring thickness for active connection count, pulse animation for incoming request, and a small sparkline for recent latency — so the viewer can read load distribution at a glance without tooltips.

For algorithm comparison (round-robin vs. least-connections vs. weighted vs. consistent-hash vs. IP-hash), render the selector as a segmented control that swaps the dispatch function but preserves the same backend pool and request stream. This makes skew visible: round-robin produces even stripes, least-connections produces convergent connection counts, weighted shows proportional fill, and consistent-hash produces stable client→backend affinity lines that only rewire when the ring changes. Include a "ring view" toggle for consistent-hash that projects the hash space onto a circle with virtual nodes as tick marks and keys as dots — this single view explains virtual nodes better than any prose.

Drive the animation loop off `requestAnimationFrame` with a fixed simulation tick (e.g. 60 logical ticks/sec) decoupled from frame rate, so pausing, step-forward, and speed multipliers (0.25× / 1× / 4×) all work without distortion. Expose a timeline scrubber backed by a ring buffer of the last N seconds of events (request dispatched, backend failed, health check fired, ring rebalanced) so users can rewind to the moment a backend was marked unhealthy and watch the rebalancing cascade.
