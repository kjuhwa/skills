---

name: circuit-breaker-data-simulation
description: Deterministic synthetic call stream generator for circuit breaker state machine demonstrations
category: workflow
triggers:
  - circuit breaker data simulation
tags: [workflow, circuit, breaker, data, simulation, synthetic]
version: 1.0.0
---

# circuit-breaker-data-simulation

To demonstrate circuit breaker behavior without a real downstream dependency, generate a synthetic call stream using a seeded PRNG combined with a configurable failure-rate schedule. Model each tick as a call with outcome `success | failure | timeout`, driven by a piecewise failure-probability curve (e.g., 0% baseline → spike to 80% between t=10s and t=25s → recover to 5%). The seeded randomness makes runs reproducible for teaching and regression-testing UI transitions, while the schedule ensures the breaker actually trips, cools down, and probes within the demo window.

Drive the state machine from the same synthetic stream rather than simulating states directly. Maintain a sliding window of the last N outcomes (or a time-based window), compute the failure ratio each tick, and apply the canonical rules: trip to OPEN when failure_count ≥ threshold within the window, schedule a cooldown timer on trip, transition to HALF_OPEN on timer expiry, and allow only a fixed number of probe calls before deciding to close or re-open. Persist every tick as an event record `{t, outcome, state_before, state_after, window_fail_ratio}` so the visualization layer and any replay tooling share one source of truth.

For "race" or comparative simulators running multiple breaker configurations side-by-side, feed all instances from the *same* synthetic stream (same seed, same schedule) and only vary the breaker parameters. This isolates configuration differences as the sole cause of divergent behavior, which is the whole pedagogical point.
