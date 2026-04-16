---
name: rate-limiter-data-simulation
description: Stochastic request generation with multi-speed tick separation and configurable traffic patterns for rate-limiter algorithm demos.
category: workflow
triggers:
  - rate limiter data simulation
tags:
  - auto-loop
version: 1.0.0
---

# rate-limiter-data-simulation

Rate-limiter simulations require separating three independent timing concerns into distinct intervals. The **refill/leak tick** runs at 50–100ms to update internal algorithm state (adding tokens, draining queue, expiring window entries). The **traffic generation tick** runs at 100–200ms, producing a random number of requests per cycle using `Math.random() * configuredRate / ticksPerSecond` to approximate Poisson-like arrival patterns. The **visualization tick** uses `requestAnimationFrame` (16ms) for smooth canvas rendering. This three-speed architecture prevents animation jank from blocking algorithm accuracy and lets each concern evolve at its natural cadence — the token-bucket refills 20 times/second, the sliding-window checks timestamps at 5Hz, and the leaky-bucket drains at 10Hz, all while the canvas repaints at 60fps.

Traffic generation uses a deliberate over-generation multiplier (typically 1.2–1.4× the configured limit) to ensure the rate limiter is regularly exercised and denial paths are visible. Each request object carries a creation timestamp (`{t: Date.now()}`) for latency calculation on processing. Three request injection modes cover different scenarios: **steady drip** (automatic `setInterval` at ~1.2s for baseline load), **manual single** (button click for precise testing), and **burst** (5 rapid requests at 80ms spacing to stress burst tolerance). The sliding-window variant uses per-endpoint configurations with different limits (`/api/login` at 5/s vs `/api/feed` at 30/s) to demonstrate how the same algorithm behaves under asymmetric constraints.

Metrics collection follows a dual-counter pattern: cumulative totals (`totalAllowed`, `totalDenied`, `processed`, `dropped`) for summary stats, plus a rolling history buffer (fixed-length array with `push/shift`) for time-series charting. Division-by-zero guards protect percentage calculations (`total > 0 ? ratio : 100`). SVG auto-scaling uses `Math.max(...values, 1)` to prevent flat-line rendering when counts are zero. Latency is computed as `Date.now() - request.timestamp` at dequeue time, averaged across recent drips with an empty-array guard. This dual-counter plus rolling-buffer pattern gives both "how are we doing overall" and "what happened in the last 60 seconds" views simultaneously.
