---

name: rate-limiter-data-simulation
description: Generating realistic request arrival patterns to stress-test rate limiter algorithms in demo apps
category: workflow
triggers:
  - rate limiter data simulation
tags: [workflow, rate, limiter, data, simulation, test]
version: 1.0.0
---

# rate-limiter-data-simulation

Rate limiter demos need traffic that exercises edge cases, not uniform Poisson noise. Build a **scenario library** with at least five patterns: (1) steady baseline (exposes sustained-rate limits), (2) burst-then-idle (exposes token-bucket refill behavior), (3) boundary-straddle (requests clustered at window edges — exposes sliding-window-counter's weighted math vs. fixed-window's "double allowance" bug), (4) sawtooth ramp (finds the exact rejection threshold), and (5) multi-tenant mixed (uneven load across keys — exposes isolation bugs in api-quota-dashboard). Drive each from a single seeded PRNG so replays are deterministic.

Simulate time with a **virtual clock** decoupled from wall-clock, advanced by a tick function the UI controls (play/pause/10x speed). This lets users scrub a 1-hour scenario in 30 seconds and freeze on the instant a rejection fires. Emit each request as an event `{t, key, accepted, remaining, algorithm_state}` — the `algorithm_state` snapshot (bucket level, window buckets, quota counters) is what powers the visualization replay without re-running the simulation.

For sliding-window-lab specifically, generate paired scenarios that produce identical fixed-window outcomes but different sliding-window outcomes — this is the pedagogical payoff. For token-bucket-visualizer, include a scenario where request cost varies (weighted tokens) to show non-uniform consumption. Keep simulations in-browser (Web Worker) so there's no backend dependency; a 10k-event scenario runs in <50ms.
