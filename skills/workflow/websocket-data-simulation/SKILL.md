---
name: websocket-data-simulation
description: Generate realistic simulated WebSocket traffic, latency, and connection lifecycle events for browser-based demos without a real server.
category: workflow
triggers:
  - websocket data simulation
tags:
  - auto-loop
version: 1.0.0
---

# websocket-data-simulation

Simulate a WebSocket connection lifecycle as a finite state machine with four states: CONNECTING → OPEN → CLOSING → CLOSED. On initialization, transition from CONNECTING to OPEN after a random delay (80-300ms) modeling the TCP+upgrade handshake. In the OPEN state, generate mock frames at configurable intervals using setInterval. Each frame should carry a randomly selected opcode (0x1 text at 70% probability, 0x2 binary at 20%, 0x9 ping at 8%, 0xA pong at 2%), a payload size sampled from a log-normal distribution (median 256 bytes, σ=1.5 to mimic real chat/telemetry traffic), and a synthetic timestamp. Inject connection interruptions at random intervals (Poisson process, λ=0.003/sec) that transition to CLOSING→CLOSED, then auto-reconnect after an exponential backoff delay (base 1s, max 30s, jitter ±25%).

For latency simulation, model round-trip time as a base value (20-40ms) plus a Gaussian noise component (σ=10ms), with occasional latency spikes injected via a separate Poisson process (λ=0.001/sec) that adds 200-800ms to simulate network congestion or GC pauses. Track these values in a circular buffer of the last 100 samples to support sparkline rendering. For throughput simulation, maintain rolling 1-second byte counters for sent and received directions independently, with the server side generating 2-5x more downstream traffic to model typical subscription/push patterns.

For multi-client arena scenarios, instantiate N independent simulation instances (8-16 clients), each with slightly different base latency and frame rate parameters drawn from uniform distributions. Assign each client a deterministic seed so that replaying produces identical traffic patterns — useful for regression testing visualizations. Expose a global simulation clock that can be paused, stepped, or run at 2x/5x speed, implemented by scaling all interval timers and delay values by a single `timeScale` multiplier. Emit all events through a single EventTarget dispatcher so visualization layers can subscribe without coupling to simulation internals.
