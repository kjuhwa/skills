---
name: rate-limiter-data-simulation
description: Client-side traffic generation and token accounting for rate limiter demos without a backend.
category: workflow
triggers:
  - rate limiter data simulation
tags:
  - auto-loop
version: 1.0.0
---

# rate-limiter-data-simulation

Rate limiter simulations require two independent clocks: a **refill timer** that replenishes tokens and a **traffic generator** that consumes them. The token bucket model maintains `tokens = Math.min(maxTokens, tokens + refillRate * dt)` each frame, where `dt` comes from `performance.now()` deltas for smooth fractional accounting. The simpler `setInterval` variant increments by 1 token per tick at `1000/refillRate` ms but causes visible stairstepping. The sliding window model stores each request's timestamp and counts `requests.filter(r => now - r.t < windowSize)` to decide acceptance — no token state needed, just an array with a cap (e.g., splice at 200 entries to bound memory).

Traffic generation uses three patterns across the apps: **manual fire** (single button click), **burst/flood** (loop N requests synchronously or via staggered `setTimeout(tryRequest, i * 60)`), and **auto-fire** (togglable `setInterval` at 300-700ms with optional randomness). The dashboard variant generates random load per endpoint as `Math.floor(Math.random() * limit * 1.6)`, ensuring roughly 37% of ticks exceed the threshold — enough to demonstrate blocking without making the system look perpetually overloaded. Each request outcome is logged to a DOM element with prepend-and-cap (`if (log.children.length > 50) log.lastChild.remove()`) to prevent unbounded DOM growth.

Interactive controls bind `<input type="range">` or `<select>` elements to simulation parameters (bucket size, refill rate, window size, max requests) via `oninput`/`onchange` handlers that update variables immediately. When bucket size shrinks, tokens must be clamped: `tokens = Math.min(tokens, maxTokens)` — omitting this creates the visually broken state of more tokens than the bucket can hold.
