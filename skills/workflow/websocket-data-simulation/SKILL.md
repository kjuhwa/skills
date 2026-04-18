---

name: websocket-data-simulation
description: Deterministic fake WebSocket traffic generator with opcode/frame fidelity for offline demos
category: workflow
triggers:
  - websocket data simulation
tags: [workflow, websocket, data, simulation]
version: 1.0.0
---

# websocket-data-simulation

Simulating WebSocket traffic requires generating events at the *frame* level, not just the message level, so visualizations can show fragmentation, control frames, and backpressure realistically. Model each emitted event as `{ts, direction, opcode, fin, payloadLen, maskKey?, payloadPreview}` and drive emission from a seeded PRNG so the same seed replays the same session — critical for screenshots, tests, and shareable demo links.

Use scenario presets that each exercise a distinct protocol behavior: a *chat* preset emits bursty text frames with idle ping/pong every 30s; a *pulse-monitor* preset emits steady 1Hz telemetry with occasional reconnect storms; a *handshake* preset emits only the upgrade sequence and first few frames then stops. Each preset should expose knobs for message rate, fragmentation threshold (split payloads >N bytes into continuation frames with opcode 0x0), and artificial latency/jitter so the visualization can demonstrate backpressure and out-of-order arrival.

Crucially, do not import a real `ws` client. A pure in-memory EventEmitter loop is faster, works offline, and avoids the CORS/TLS friction that kills browser-based WS demos. Expose a single `start(seed, preset)` / `stop()` / `step()` API so the UI layer stays agnostic of whether events come from a live socket or the simulator.
