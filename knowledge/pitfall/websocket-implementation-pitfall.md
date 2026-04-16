---
name: websocket-implementation-pitfall
description: Common pitfalls when building browser-based WebSocket simulations and visualizations without a real backend.
category: pitfall
tags:
  - websocket
  - auto-loop
---

# websocket-implementation-pitfall

The most dangerous pitfall in simulated WebSocket demos is timer drift under background tabs. Browsers throttle setInterval/setTimeout to 1-second minimum intervals when a tab is not visible (and even longer in some browsers). A simulation that generates 20 frames/sec in the foreground silently drops to 1 frame/sec in the background, causing the circular buffers and throughput counters to show incorrect values when the user returns. The fix is to track elapsed wall-clock time via performance.now() at each tick and generate the correct number of catch-up events rather than assuming each tick represents one interval. Without this, latency sparklines show artificial flat lines and throughput graphs crater to near-zero during background periods.

A second common failure is unbounded memory growth from frame history. Each simulated frame object (timestamp, opcode, payload size, direction, latency) is small (~80 bytes), but at 20 frames/sec across 16 clients, the history grows at ~25KB/sec. In a long-running demo, this accumulates into hundreds of megabytes within an hour, leading to GC pauses that ironically cause the very latency spikes the simulation is trying to model. Always cap history with a fixed-size circular buffer (e.g., 500 entries per connection) and never store actual payload content — only metadata. The waterfall/timeline view should virtualize rendering so only visible rows are drawn.

A third pitfall is the reconnection thundering-herd effect in multi-client simulations. When a simulated "server restart" event triggers all N clients to reconnect simultaneously, they all fire their CONNECTING→OPEN transition at nearly the same instant, producing an unrealistic burst. Real WebSocket clients use jittered exponential backoff precisely to avoid this. The simulation must replicate this: each client's reconnect delay should be `baseDelay * 2^attempt * (0.75 + Math.random() * 0.5)`, and the server-side accept rate should be throttled to model realistic connection-accept throughput (typically 1000-5000 upgrades/sec). Without this, arena-style visualizations show all connections snapping back simultaneously, which misrepresents real-world behavior and hides reconnection storm bugs.
