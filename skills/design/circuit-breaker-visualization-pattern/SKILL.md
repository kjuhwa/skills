---
name: circuit-breaker-visualization-pattern
description: Render circuit breaker state machines with color-coded CLOSED/OPEN/HALF_OPEN transitions and live failure metrics
category: design
triggers:
  - circuit breaker visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# circuit-breaker-visualization-pattern

Circuit breaker UIs benefit from a tri-state visual language that mirrors the underlying state machine: green for CLOSED (traffic flowing), red for OPEN (traffic blocked), amber for HALF_OPEN (probing). Anchor the visualization on a prominent state badge with an animated transition timer (e.g., "Opens in 3.2s after 5 failures") and pair it with a request flow diagram showing upstream→breaker→downstream, where the breaker node pulses when rejecting calls. Use a sparkline or rolling-window chart for the failure rate (last N seconds), with a horizontal threshold line that turns the area red when the rate crosses the trip threshold.

For dashboards monitoring multiple breakers, render each as a card with status chip, current failure ratio, time-in-state, and a mini timeline of the last state transitions. Group cards by downstream dependency and support filtering by state so operators can zero in on OPEN breakers during incidents. Always surface the next automatic action ("Will probe in 15s") because the half-open transition is non-obvious and users mentally model breakers as static.

Puzzle/learning apps should expose the same primitives but let users tune `failureThreshold`, `resetTimeout`, and `halfOpenMaxCalls` via sliders and watch the state diagram react in real time. A sequence log ("T+2.1s: call failed (3/5)", "T+4.0s: breaker tripped → OPEN") converts the abstract state machine into a concrete narrative, which is what makes the pattern click for learners.
