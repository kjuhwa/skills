---
name: circuit-breaker-data-simulation
description: Tick-based simulation of circuit breaker state transitions with configurable thresholds, timeouts, and per-state failure rates.
category: workflow
triggers:
  - circuit breaker data simulation
tags:
  - auto-loop
version: 1.0.0
---

# circuit-breaker-data-simulation

The simulation models each breaker as a state object carrying `state` (closed/open/half-open), `failures` (current consecutive count), `threshold` (trip point), `timeout` (recovery delay), and counters for total/success/failure. Each tick drives a single request through the breaker: in CLOSED state, a random check against a base failure rate (typically 0.18–0.25) increments failures or successes; when failures reach the threshold, the breaker transitions to OPEN and records `lastChange` or starts a cooldown counter. In OPEN state, no requests pass — the tick simply checks whether the timeout has elapsed (either via `Date.now() - lastChange > timeout` in wall-clock mode, or by decrementing a tick-based cooldown counter), and if so transitions to HALF-OPEN.

HALF-OPEN is the critical probing state: it uses an elevated failure rate (0.35–0.40) to model the fragility of a recovering dependency. A single success resets failures to zero and transitions back to CLOSED; a single failure immediately re-trips to OPEN. This asymmetry — one success to close, one failure to re-open — faithfully models real circuit breaker libraries (Resilience4j, Hystrix, Polly). The multi-service variant assigns per-service thresholds and timeouts (`Auth: 5/8s`, `Payment: 3/10s`, `Inventory: 4/6s`) to demonstrate that breakers in a real system trip at different sensitivities reflecting each dependency's reliability profile.

Two timing strategies appear across the apps: wall-clock (`Date.now()` deltas for open-to-half-open transitions, used in the dashboard and flow apps) and tick-counting (a decremented integer cooldown, used in the timeline app). Wall-clock is more realistic for production simulations; tick-counting is deterministic and better for demos or tests where you want reproducible sequences. Both emit the same state transitions and can feed any of the three visualization types.
