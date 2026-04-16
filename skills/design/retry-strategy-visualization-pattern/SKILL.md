---
name: retry-strategy-visualization-pattern
description: Visual timeline pattern for rendering retry attempts with backoff intervals, jitter bands, and success/failure outcomes
category: design
triggers:
  - retry strategy visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# retry-strategy-visualization-pattern

Retry strategy visualizers benefit from a horizontal time-axis layout where each attempt is rendered as a discrete marker (circle or bar) positioned by its scheduled dispatch time. The gap between markers visually encodes the backoff curve — exponential strategies produce widening gaps, linear strategies produce uniform gaps, and fixed strategies produce identical spacing. Overlay a translucent "jitter band" around each attempt marker to show the randomization window (±jitter%), which makes the difference between full-jitter, equal-jitter, and decorrelated-jitter immediately legible. Color-code markers by outcome: amber for in-flight, red for failed (retryable), dark-red for exhausted, green for success.

A second synchronized panel should show the cumulative delay budget consumed versus the configured deadline/timeout ceiling as a stacked area chart. This surfaces the "retry cliff" — the moment where the next scheduled attempt would exceed the deadline and must be aborted. Annotate circuit breaker state transitions (closed → open → half-open) as vertical guide lines across both panels so viewers can correlate retry bursts with breaker trips. For multi-request scenarios, use small multiples (one row per request-id) rather than overlaying, since retry timelines quickly become unreadable when superimposed.

Interactive controls should live in a sticky side panel with grouped sliders: base delay, max delay, multiplier, jitter factor, max attempts, and a strategy-type radio group. Re-render on slider drag using requestAnimationFrame throttling; full re-simulation on pointer-up. Always display the computed sequence as a readable list (attempt #, delay ms, cumulative ms) beneath the chart — the numeric view is what engineers copy into config files.
