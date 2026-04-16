---
name: rate-limiter-visualization-pattern
description: Canvas/SVG bucket-fill and timeline rendering for real-time rate limiter state.
category: design
triggers:
  - rate limiter visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# rate-limiter-visualization-pattern

Rate limiter visualizations converge on two complementary views: a **capacity gauge** (bucket fill-level) and a **temporal timeline** (request dots over time). The bucket gauge draws a rectangular container whose fill height is `(currentTokens / maxTokens) * bucketHeight`, with individual token circles arranged in a grid inside the filled region. Color-coding is binary — green (`#6ee7b7`) for healthy capacity, red (`#f87171`) when tokens are critically low or a request is rejected. The timeline view (SVG or Canvas) maps `request.timestamp` to an x-coordinate via `x = (t - viewStart) / (viewEnd - viewStart) * width`, plotting accepted vs. rejected requests as colored circles within a sliding window highlight region.

For multi-endpoint dashboards, each endpoint gets a **sparkline card** — a small Canvas drawing a polyline of request-rate samples over a rolling window (typically 30-40 data points). A dashed horizontal line marks the rate limit threshold, and any sample exceeding the threshold gets a red dot overlay. Stats (total requests, blocked count, pass percentage) are computed incrementally per tick and rendered below the sparkline. This card-per-endpoint pattern scales to any number of APIs by iterating an endpoint config array with `{id, limit, data[], blocked, total}`.

Particle effects add polish to the single-bucket view: on each request, spawn a particle at the bucket mouth with `{x, y, vy, life, ok}`, update position each frame, and filter out dead particles. The `requestAnimationFrame` loop handles both smooth token refill (`tokens += refillRate * dt`) and particle animation in a single render pass, avoiding the jank of `setInterval`-only approaches.
