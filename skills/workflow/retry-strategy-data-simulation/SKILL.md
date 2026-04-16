---
name: retry-strategy-data-simulation
description: Deterministic simulation harness for generating retry attempt sequences with configurable failure injection and seeded jitter
category: workflow
triggers:
  - retry strategy data simulation
tags:
  - auto-loop
version: 1.0.0
---

# retry-strategy-data-simulation

Retry strategy simulators need a pure, deterministic core: a function `simulate(config, failurePattern, seed) → Attempt[]` that takes a strategy config, an array of scripted outcomes (e.g. `['fail','fail','fail','success']` or a failure probability), and a PRNG seed. The seed is non-negotiable — without it, jitter-based strategies produce different results each render and users cannot compare two configs side-by-side. Use a small seeded PRNG (mulberry32 or sfc32) rather than `Math.random()`. Each Attempt record should capture: attempt index, scheduled-at ms, actual-dispatched-at ms, delay-from-previous ms, jitter-applied ms, outcome, and cumulative elapsed ms.

Model the failure pattern as first-class data rather than a callback. Options: (a) scripted array walked in order, (b) Bernoulli per attempt with probability p, (c) burst mode (N consecutive failures then recover), (d) flaky mode (alternating). This lets the UI expose a "failure scenario" dropdown and reproduces real-world patterns (transient network blips vs. sustained outages vs. rate-limit throttling). Cap the simulator at max-attempts AND a hard wall-clock deadline — both are real retry-system constraints and both must short-circuit the loop.

Precompute the full attempt array once per config change and memoize by a stable hash of `{config, pattern, seed}`. Downstream chart components consume the memoized array; sliders only invalidate on pointer-up to avoid thrashing. Expose the attempt array as exportable JSON/CSV — engineers frequently want to paste a sequence into a bug ticket or compare against production traces. For storm simulations (many concurrent requests), generate N independent seeded runs and aggregate into percentile bands (p50/p95/p99) rather than rendering every individual timeline.
