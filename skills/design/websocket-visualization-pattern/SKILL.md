---
name: websocket-visualization-pattern
description: Render WebSocket traffic, latency, and connection state using three complementary visual encodings (canvas time-series, SVG frame flow, DOM chat stream).
category: design
triggers:
  - websocket visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# websocket-visualization-pattern

WebSocket visualizations split naturally into three rendering tiers based on what aspect of the protocol is being shown. For **throughput and latency monitoring**, use an HTML Canvas with a rolling-window line chart: maintain a fixed-length array of latency samples (e.g., 120 points), shift old values out as new ones arrive, and draw the polyline plus a semi-transparent fill beneath it. Pair the canvas with stat cards showing current latency (ms), messages-per-second (counter reset each `setInterval` tick), and a connection status badge. For **frame-level protocol flow**, use SVG with vertical dashed timelines for CLIENT and SERVER endpoints, then animate `<circle>` + `<line>` pairs traveling left-to-right or right-to-left to represent directional frames. Color-code by frame type: green (`#6ee7b7`) for TEXT, blue (`#60a5fa`) for BINARY, purple (`#f0abfc`) for control frames (PING/PONG/CLOSE). Reset the vertical position and clear old frame groups once `yPos` exceeds the viewBox height.

For **application-layer chat simulation**, render a two-panel DOM layout — a sidebar showing user presence (colored dots: green = online, amber = idle) and a scrolling message area. Each message is a `<div>` with sender name, text body, and timestamp. Incoming bot messages and user-submitted messages share the same rendering path but differ by CSS class (`.me` vs `.other`). Across all three tiers, use a consistent dark palette (`#0f1117` background, `#1a1d27` panel surfaces, `#6ee7b7` primary accent) and monospace or system-UI fonts. Every visualization must include a **connection status indicator** that periodically flips to a "RECONNECTING" amber state (`#fbbf24`) with a timed auto-recovery — this teaches the viewer that WebSocket UIs must always surface connection health prominently, not bury it.
