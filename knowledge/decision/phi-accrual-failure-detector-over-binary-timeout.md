---
version: 0.1.0-draft
name: phi-accrual-failure-detector-over-binary-timeout
description: Use phi-accrual suspicion score instead of binary alive/dead for heartbeat visualizations
category: decision
tags:
  - lease
  - auto-loop
---

# phi-accrual-failure-detector-over-binary-timeout

Binary "alive if heartbeat within T, else dead" timeouts produce jittery, hard-to-tune visualizations where nodes flip state on every GC pause. Phi-accrual failure detection (Hayashibara et al.) maintains a sliding window of inter-arrival times, fits a distribution, and outputs a continuous suspicion value φ — roughly `-log10(P(next arrival later than now))`. Threshold comparisons (φ > 8 → suspect, φ > 12 → dead) become tunable dials rather than brittle timeouts.

For a registry/heartbeat demo this pays off twice: the rendering gets a smooth 0→∞ suspicion gradient to animate (color ramp, opacity fade) instead of a binary flip, and demonstrations of "slow network but alive" versus "fast network but dead" become visually distinguishable. Implementation is ~30 lines: maintain a ring buffer of arrival deltas, compute running mean+variance, and `phi = -log10(1 - cdf(now - lastArrival))` under a normal approximation.

The decision: reach for phi-accrual (or at least a continuous suspicion score) whenever a visualization needs to *teach* the fuzziness of failure detection. Reserve binary timeouts for code paths that actually need a boolean decision — and even then, derive the boolean from the continuous score at a threshold, not from a bare clock check.
