---
name: circuit-breaker-data-simulation
description: Tick-based probabilistic state machine for generating realistic circuit-breaker open/close/half-open transitions with configurable failure rates and cooldown jitter.
category: workflow
triggers:
  - circuit breaker data simulation
tags:
  - auto-loop
version: 1.0.0
---

# circuit-breaker-data-simulation

The simulation engine models a circuit breaker as a tick-driven state machine with three variables: `state` (string: 'closed'|'open'|'half'), `failures` (integer counter), and `cooldownLeft` (countdown timer). Each tick (300–800ms depending on desired pace) executes one transition step. In CLOSED state, a request fails with probability 12–15%; in HALF_OPEN, the failure probability rises to 35–40% to model realistic probe fragility. When `failures >= threshold`, the breaker trips to OPEN, sets `cooldownLeft = base + Math.floor(Math.random() * jitter)` (e.g., 8+rand(5) or 10+rand(4)), and stops processing requests. Each OPEN tick decrements the cooldown; at zero, the state transitions to HALF_OPEN. A single success in HALF_OPEN resets `failures=0` and returns to CLOSED; a failure re-trips to OPEN. In CLOSED, successful ticks decay the failure counter by 1 (`Math.max(0, failures-1)`), modeling recovery.

For multi-service dashboards, each service gets its own threshold (varying 3–5) and independent failure probability, creating staggered state changes that look organic rather than synchronized. The simulator variant replaces probabilistic generation with manual request injection (buttons for success vs. failure), letting users explore edge cases deterministically while reusing the same state machine. History is stored as an array of `{state, failed, failures, t}` objects, capped at a max window (e.g., 120 points) via `shift()` rotation. Initializing the history buffer with 20–30 pre-simulation ticks prevents the "empty chart" cold-start problem. For the HALF_OPEN entry point, resetting failures to `Math.floor(threshold/2)` instead of 0 produces more realistic oscillation between OPEN and HALF_OPEN before eventual recovery.
