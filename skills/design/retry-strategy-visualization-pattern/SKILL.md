---
name: retry-strategy-visualization-pattern
description: Reusable visual encoding patterns for rendering retry timing, backoff curves, and circuit-breaker state across canvas, SVG, and DOM renderers.
category: design
triggers:
  - retry strategy visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# retry-strategy-visualization-pattern

Retry visualizations require three distinct visual layers mapped to the retry lifecycle: **delay magnitude** (how long each wait is), **attempt outcome** (success/fail per try), and **cumulative cost** (total elapsed time across the retry sequence). The most effective pattern decouples the delay calculation engine (`calcDelays(strategy, base, maxRetries, jitter)`) from the rendering pass (`draw(delays, outcomes)`), allowing the same simulation data to feed a canvas bar chart (app 84's vertical bars with gradient fills—green/teal for success, red for failure), DOM-based progress lanes (app 85's horizontal race tracks with CSS `transition: width 0.3s`), or a multi-metric dashboard (app 86's dual canvas line charts for RPS and failure rate plus an SVG circular arc for circuit state). Color semantics must stay consistent: green/teal = success/healthy/closed, red = failure/open, yellow = transitional/half-open. Use `stroke-dasharray`/`stroke-dashoffset` on an SVG circle (circumference 264) to animate circuit-breaker health as a ring gauge—full arc for CLOSED, half for HALF_OPEN, zero for OPEN.

When visualizing competitive retry strategies side-by-side (fixed vs. exponential vs. linear+jitter), introduce **visual time compression**: render animation delays at `Math.min(actualDelay / 3, 400ms)` so exponential backoff sequences that reach 8-16 seconds in simulation still complete in under 2 seconds on-screen. This separation of "simulated time" from "visual time" is critical for interactive UIs—without it, exponential backoff demos become unwatchable. For continuous monitoring views, maintain a fixed-size rolling history buffer (e.g., 40 ticks) using `push()`/`shift()` to prevent unbounded memory growth while giving enough temporal context to see state transitions. Canvas line charts should draw 3-4 horizontal grid lines at even intervals with labeled Y-axis values (RPS 0-30, failure rate 0-100%) to provide reference anchors. Bar charts need dynamic width calculation: `Math.min(50, canvasWidth / attemptCount - 10)` to remain readable from 1 to 10+ retry attempts.

All retry visualizations benefit from a **status badge progression** pattern: each strategy or endpoint displays a badge that transitions through states (READY → Retry #N → SUCCESS/FAILED) with color-coded backgrounds. For dashboard views, pair the live chart with a stats panel showing discrete counters (success count, failure count, total retries, current state) so operators get both trend and snapshot. The dark theme (#0f1117 background, #6ee7b7/#f87171 accents) provides strong contrast for failure/success differentiation without eye strain during extended monitoring.
