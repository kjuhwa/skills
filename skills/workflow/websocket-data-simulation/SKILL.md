---
name: websocket-data-simulation
description: Generate realistic simulated WebSocket traffic (latency curves, typed frames, chat presence) without a live server using timer-driven random generators.
category: workflow
triggers:
  - websocket data simulation
tags:
  - auto-loop
version: 1.0.0
---

# websocket-data-simulation

WebSocket data simulation replaces a real server with `setInterval`-driven generators that produce protocol-realistic values. For **latency simulation**, generate random values in a bounded range (e.g., `Math.random() * 80 + 5` for 5–85ms) at a fast cadence (every 300ms). Maintain a rolling buffer (`pts.push(val); if (pts.length > N) pts.shift()`) that feeds the visualization. Track a `msgCount` variable that resets to zero every second to derive a messages-per-second rate. For **frame-type simulation**, define the WebSocket frame vocabulary (`TEXT`, `BIN`, `PING`, `PONG`, `CLOSE`) and pick randomly each tick, assigning a random payload size (0–2048B). Bias directionality — e.g., 65% client-to-server — to mimic real traffic patterns where clients send more requests than they receive unsolicited pushes.

For **chat and presence simulation**, maintain an array of usernames and an `online` subset. Bot messages fire on a jittered interval (`3000 + Math.random() * 2000`ms) picking a random online user and a random phrase from a domain-relevant pool (protocol terms like "RFC 6455", "binary frames", "connection upgrade"). Presence changes fire on a slower timer (~4 seconds) with a low probability gate (`Math.random() > 0.9`), toggling users between online and offline to simulate join/leave churn. **Connection disruption simulation** is critical across all modes: use a rare probability check (`> 0.92–0.95`) on a 2–5 second timer to flip the UI into a "reconnecting" state, then auto-recover after 1.5–2 seconds. This pattern teaches that any WebSocket demo must model the unhappy path — connections drop, and the UI must handle it gracefully. All timers should be independent `setInterval` calls rather than a single game loop, since WebSocket events are asynchronous and bursty by nature.
