---
name: websocket-visualization-pattern
description: Render WebSocket traffic as directional animated particles on a split-lane canvas with live counters and a scrolling packet log.
category: design
triggers:
  - websocket visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# websocket-visualization-pattern

Split the canvas into two horizontal lanes — outbound (top) and inbound (bottom) — separated by a dashed midline. Each WebSocket frame spawns a circle whose radius encodes payload size and whose colour distinguishes direction (green for outbound, blue for inbound). Particles drift left via `requestAnimationFrame`, fading with decreasing alpha until they are culled from the array. A stats bar above the canvas tracks sent count, received count, and last-observed latency in real time. Below the canvas, a monospace log prepends each frame as a one-liner (`↑ TEXT 512B 23ms`) colour-coded by direction, capping at ~50 entries to prevent DOM bloat.

The key design decisions are: (1) use `clientWidth * 2` on resize so the canvas is crisp on HiDPI screens, (2) keep the packet array flat and filter-in-place every frame instead of using object pooling — acceptable when the spawn rate is low (one packet every 300-500 ms), and (3) encode all frame metadata (opcode, size, latency) at creation time so the render loop touches only position and alpha. This lets you overlay a protocol-aware HUD on any live or simulated WebSocket stream without coupling the visualisation to the transport layer.

To adapt to a real connection, replace the `setInterval(addPacket, 400)` stub with a listener on `WebSocket.onmessage` and a wrapper around `WebSocket.send` that calls `addPacket` with actual opcode, `event.data.byteLength`, and `performance.now()` delta. The canvas animation and log remain unchanged — they consume the same `{x, y, outbound, type, size, lat, alpha}` shape regardless of data source.
