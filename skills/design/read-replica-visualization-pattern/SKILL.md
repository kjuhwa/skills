---
name: read-replica-visualization-pattern
description: Canvas/SVG visualization of primary-to-replica WAL flow, per-replica lag gauges, and load-balanced request distribution bars.
category: design
triggers:
  - read replica visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# read-replica-visualization-pattern

The topology view uses an HTML5 Canvas with a fixed hierarchy: primary node at top-center, replicas in a middle row, and reader applications at the bottom. Animated packets travel along linear-interpolated paths (`t += 0.03` per frame) with color-coded semantics — green (#6ee7b7) for WAL replication streams flowing downward from primary to replicas, blue (#60a5fa) for read queries flowing upward from apps to a randomly selected replica. Each node is drawn as a stroked arc with a translucent fill and live stat labels (write QPS on primary, lag-ms on replicas). A stats bar at the bottom aggregates total writes, average replica lag, and replica count.

For lag monitoring, a 2x2 card grid shows per-replica current lag with threshold-driven styling: default teal, amber (#f59e0b) above 25 ms, red (#ef4444) above 40 ms — applied to both the value text and card border. Below the cards, an SVG time-series chart renders 60-second rolling polylines per replica (one color per AZ name), with horizontal grid lines at 20 ms intervals and a 0–60 ms Y-axis. The chart rebuilds its full innerHTML each tick rather than appending, keeping DOM weight constant.

The load-balancer view pairs a horizontal bar chart (fill width = `reqs/max * 100%` with CSS transitions) with a live transaction log (auto-scrolling monospace list showing timestamp, target replica, and active strategy). A button row toggles between Round Robin, Least Connections, and Weighted strategies. This three-panel layout — control strip, proportional bars, and scrolling log — is the reusable skeleton for any replica-aware request routing dashboard.
