---
name: websocket-data-simulation
description: Deterministic synthetic WebSocket traffic generator for demos and load simulation
category: workflow
triggers:
  - websocket data simulation
tags:
  - auto-loop
version: 1.0.0
---

# websocket-data-simulation

WebSocket demos need realistic-feeling traffic without a real backend. Build a simulator that emits frames on three independent clocks: a fast clock (50-200ms) for application data frames with randomized payload sizes drawn from a log-normal distribution (most frames small, occasional bursts), a slow clock (20-30s) for ping/pong pairs to match RFC 6455 defaults, and a rare-event clock (seeded PRNG) for connection churn (opens, closes with various codes 1000/1001/1006/1011, reconnects with exponential backoff).

Drive the simulator from a seeded PRNG so demos are reproducible — the same seed produces the same frame sequence, the same disconnect at t=47s, the same burst at t=112s. Expose knobs for frame-rate multiplier, error injection probability, and client count. For swarm scenarios, model each virtual client as an independent state machine with its own RTT jitter (sample from a gamma distribution, mean 30-80ms) so the aggregate looks natural rather than lockstep.

Critically, simulate the asymmetries real WebSocket traffic exhibits: server→client is usually higher volume than client→server, control frames cluster around reconnects, and close frames often arrive without a preceding close handshake (code 1006). A simulator that only emits clean text frames at a steady rate will mislead viewers about what production traffic actually looks like.
