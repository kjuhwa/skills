---
name: websocket-visualization-pattern
description: Real-time visualization pattern for WebSocket frame flow, connection state, and message throughput
category: design
triggers:
  - websocket visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# websocket-visualization-pattern

WebSocket-focused dashboards should visualize three distinct layers simultaneously: the connection lifecycle (CONNECTING → OPEN → CLOSING → CLOSED with ping/pong heartbeats overlaid), the frame stream (binary vs text frames, opcodes 0x1/0x2/0x8/0x9/0xA rendered as colored lanes on a horizontal timeline), and aggregate throughput (frames/sec and bytes/sec as dual-axis sparklines). Use a split-pane layout: left pane shows the raw frame inspector with hex+ASCII dump, right pane shows the aggregated timeline. Each frame should animate in from the right edge with a fade, giving operators a visceral sense of traffic intensity without needing to parse numbers.

Color-code by semantic role rather than opcode value: green for application data (text/binary), amber for control frames (ping/pong), red for close frames, grey for continuation. Highlight masked vs unmasked frames with a border treatment since this distinguishes client→server from server→client flow. For chat-swarm style multi-client views, render each connection as a horizontal swim lane with a synchronized time axis so operators can spot fan-out patterns, stuck clients, and correlated disconnects at a glance.

Always surface backpressure signals visually: bufferedAmount growth should render as a rising fill in the connection row, and frame-rate drops should pulse the lane amber. These derived signals matter more than raw frame counts because they predict disconnects before they happen.
