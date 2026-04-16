---
name: load-balancer-visualization-pattern
description: Canvas-based visualization patterns for rendering load-balancer traffic flow, server pools, and algorithm comparisons in real time.
category: design
triggers:
  - load balancer visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# load-balancer-visualization-pattern

Load-balancer visualizations share a common spatial layout: clients on the left, a central load-balancer node, and a server pool on the right (or bottom). Servers are positioned programmatically via a `layoutServers()` function that distributes nodes evenly across available canvas space, each rendered as a circle or card with a live connection-count badge. Request flow is shown through animated particles that travel from client → LB → target server, with color encoding to distinguish algorithms (e.g., round-robin = blue, least-connections = green, weighted-random = orange). The animation loop uses `requestAnimationFrame` with a particle pool that spawns on each request event and removes particles once they reach their destination.

For algorithm comparison views, a lane-based layout places each algorithm in its own horizontal row with per-server bar charts that grow in real time as requests are distributed. Each lane tracks two key metrics: total request count per server and variance (σ²) across the pool, giving an at-a-glance fairness score. The bars are normalized to the maximum count so visual proportions stay meaningful even as totals climb. A shared timer drives all lanes in lockstep so the race is fair. This pattern—parallel lanes with synchronized stepping and a single summary statistic—is reusable for any "compare N strategies" visualization beyond load balancing.

Health dashboards use a card grid where each node card is color-coded by status (green/up, yellow/degraded, red/down) determined by CPU-threshold rules (>95% = down, >85% = degraded). Each card surfaces five metrics (CPU, memory, RPS, latency, error rate) and a time-series sparkline chart at the bottom plots RPS history across all nodes on a shared Y-axis with a grid overlay. The 1-second tick interval updates metrics with bounded random walks (`Math.random() * delta` clamped to min/max), keeping the simulation realistic without external data. This card-plus-sparkline pattern translates directly to any multi-node infrastructure dashboard.
