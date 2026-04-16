---
name: distributed-tracing-data-simulation
description: Three strategies for generating synthetic distributed trace data — flat span lists, directed service graphs, and recursive span trees.
category: workflow
triggers:
  - distributed tracing data simulation
tags:
  - auto-loop
version: 1.0.0
---

# distributed-tracing-data-simulation

Realistic trace simulation requires modeling the causal and temporal structure of distributed calls, not just random rectangles. The **flat waterfall** strategy generates a configurable number of spans (depth 4–8) in a single loop: span 0 starts at t=0, subsequent spans pick a random existing span as parent and offset their start by `parent.start + random * 30ms`. Duration is `10 + random * (totalMs / depth)` to ensure spans fit within the trace's total envelope (200–1000ms). Each span carries a service name cycled from a fixed service registry (`services[i % services.length]`), a random 8-char hex ID, and a palette color. This produces plausible fan-out patterns with overlapping spans but no true hierarchy — ideal for waterfall views where parent-child nesting isn't visually encoded.

The **directed graph** strategy models inter-service communication. Nodes are placed using polar coordinates and each node generates 1–3 random outbound edges to other nodes, with a latency attribute (1–80ms). Animated particles are spawned stochastically each frame (`if (random < 0.3) spawn()`) and travel along edges with a linear interpolation parameter `t` that increments by a random speed per frame. This produces a live-traffic feel without needing actual request data. Node metadata (requests/sec) is generated once at init as `Math.floor(random * 500)`.

The **recursive tree** strategy produces hierarchically correct flame-chart data. A `genTree(depth, start, totalWidth, maxDepth)` function creates one span at the current depth with `dur = totalWidth * (0.5 + random * 0.5)`, then recurses 1–2 children whose widths are `dur * (0.2 + random * 0.3)`. A cursor tracks the horizontal offset to prevent child spans from exceeding the parent's end time (`if (cursor + childW > start + dur) break`). Max depth is randomized (4–8 levels) and total trace width is 200–800ms. This produces the nested containment invariant required by flame charts: every child span is strictly within its parent's time bounds.
