---
name: websocket-visualization-pattern
description: Reusable visual encoding patterns for rendering WebSocket connection state, frame flow, and latency in canvas/SVG dark-theme dashboards.
category: design
triggers:
  - websocket visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# websocket-visualization-pattern

Render WebSocket traffic as a directed particle stream between client and server nodes on a dark canvas (#0f1117 background). Each frame type gets a distinct visual encoding: text frames as green (#6ee7b7) rectangles, binary frames as cyan circles, ping/pong as small amber diamonds, and close frames as red Xs. Animate particles along a spline path from sender to receiver at a speed inversely proportional to simulated latency, so users can visually perceive delay without reading numbers. Draw a persistent "connection rail" line between endpoints — solid for OPEN state, dashed-animated for CONNECTING, and faded-red for CLOSED — so connection lifecycle is always visible at a glance.

For heartbeat visualization (as in websocket-pulse), use a pulsating ring around the server node that expands on each ping and contracts on pong receipt. Map the ring's color from green→yellow→red based on round-trip time thresholds (e.g., <50ms green, 50-200ms yellow, >200ms red). Overlay a trailing sparkline of the last 30 RTT samples beside the connection rail. For frame inspection (as in websocket-frames), render each frame as a horizontal bar in a vertical waterfall timeline — width proportional to payload size, color-coded by opcode. Add a tooltip layer showing raw header bits (FIN, RSV1-3, opcode, mask, payload length) decoded from the simulated frame structure.

For multi-connection scenarios (as in websocket-arena), arrange N client nodes in a semicircle facing the server. Use stacked bar charts beneath each client showing cumulative bytes sent vs received. Highlight the connection with the highest throughput using a glow effect. When a connection drops, animate a "crack" effect on its rail and grey out its node, preserving its position so the topology remains stable. All visualizations should use requestAnimationFrame with a 60fps target and batch canvas draw calls per frame to avoid per-particle overhead.
