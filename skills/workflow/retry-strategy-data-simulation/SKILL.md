---
name: retry-strategy-data-simulation
description: Generate synthetic failure streams and retry attempts to stress-test backoff, jitter, and budget policies
category: workflow
triggers:
  - retry strategy data simulation
tags:
  - auto-loop
version: 1.0.0
---

# retry-strategy-data-simulation

Drive the simulation from a configurable failure model rather than random booleans: define per-endpoint failure probability, failure mode distribution (timeout vs 429 vs 503 vs connection-reset), and optional burst windows where probability spikes to simulate upstream incidents. Each tick, spawn new requests at a target RPS, and for every in-flight request evaluate the strategy under test: compute next delay from the policy (fixed/linear/exponential with full/equal/decorrelated jitter), decrement the retry budget, and check circuit-breaker state. Emit an event log of `{requestId, attempt, scheduledAt, firedAt, outcome, delayMs, budgetRemaining}` that feeds both the timeline visualization and the metrics panel.

Make the failure generator deterministic given a seed so users can replay scenarios and compare strategies side-by-side: same seed + same failure model, swap only the retry policy, and diff the resulting success rate and tail latency. Precompute the next-delay schedule when a request is first queued rather than recomputing on each retry, which keeps the simulation cheap at high RPS and lets the UI draw the full projected track before attempts actually fire. Cap simulation memory by evicting completed requests older than the visible time window into an aggregate histogram.

Expose controls for the key levers: base delay, multiplier, max attempts, jitter mode, per-caller retry budget (e.g., 10% of request volume per Google SRE), and a "retry storm" toggle that disables budget enforcement to demonstrate how naive retries amplify load during partial outages. Preset scenarios (thundering herd, slow degradation, flapping dependency, budget exhaustion) give users a starting point without needing to hand-tune probability curves.
