---
name: rate-limiter-visualization-pattern
description: Canvas-based visual metaphor for rate-limiter algorithms with color-coded saturation, particle feedback, and real-time parameter controls.
category: design
triggers:
  - rate limiter visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# rate-limiter-visualization-pattern

Rate-limiter visualizations work best when the algorithm's core metaphor is rendered literally on an HTML5 Canvas. The token-bucket app draws a rectangle that fills bottom-up like liquid; the leaky-bucket app renders queued requests as circles inside a container with dripping particles below; the sliding-window app uses SVG time-series lines tracking allowed vs. denied rates. In each case the visual directly maps to the algorithm's mental model — fill level equals tokens remaining, drip speed equals leak rate, line slope equals request throughput. The canvas should run at 60fps via `requestAnimationFrame` for the animation loop, with separate `setInterval` ticks for the algorithm simulation (50–200ms) so that visual smoothness is decoupled from algorithmic granularity.

All three apps share a three-tier color-coding system tied to capacity saturation: green (`#6ee7b7`) for 0–60% load, yellow (`#fbbf24`) for 60–90%, and red (`#f87171`) for 90–100%. This palette is applied consistently to bucket fills, progress bars, particle colors, and log entries. Request outcomes are visualized as ephemeral particles — allowed requests get green particles with upward velocity, denied/dropped requests get red particles with random scatter — each carrying a `life` float (1→0) that controls both opacity and radius, with dead particles filtered every frame to prevent memory bloat. This particle-feedback pattern gives instant visual confirmation without cluttering the UI with text.

Interactive controls follow a uniform pattern: HTML range sliders bound to algorithm parameters (capacity, rate, traffic) with real-time value display spans, plus action buttons for manual triggers ("Send Request") and burst simulation ("Burst x5", "Drop Request"). Parameter changes take effect immediately — when a capacity slider decreases, current state is clamped (`tokens = Math.min(tokens, newMax)`) to prevent impossible states. A timestamped event log (prepended, auto-trimmed to 30 entries) or stats panel (req/s, allowed, denied, success%) provides textual confirmation alongside the visual. The entire app ships as three files (HTML/JS/CSS) with zero dependencies, dark theme (`#0f1117` background, `#1a1d27` panels), and under 60 lines of JS total.
