---
name: rate-limiter-implementation-pitfall
description: Common traps in browser-based rate-limiter implementations — timer drift, floating-point token decay, capacity resize races, and sliding-window clock sensitivity.
category: pitfall
tags:
  - rate
  - auto-loop
---

# rate-limiter-implementation-pitfall

**Timer and clock pitfalls** are the most insidious. Browser `setInterval` is not guaranteed to fire at exact intervals — under heavy load or background tabs, a 50ms interval can drift to 80–200ms, causing token refill or leak rates to deviate significantly from configured values. The token-bucket app refills at `refillRate/20` per 50ms tick, so a delayed tick doesn't "catch up" — it simply under-refills, making the limiter stricter than configured. The sliding-window app uses `Date.now()` for timestamp comparison (`now - t < 1000`), which breaks if the system clock jumps backward (e.g., NTP correction), leaving stale timestamps permanently inside the window and artificially reducing available capacity. In production, use monotonic clocks (`performance.now()`) for window duration and delta-based refill (`elapsed * rate`) instead of fixed-increment refill to compensate for timer jitter.

**Floating-point precision decay** affects token-bucket implementations that store tokens as floats. Adding `refillRate/20` every 50ms accumulates rounding errors over thousands of cycles — after an hour of operation, the actual token count can drift by 0.1–0.5 tokens from the expected value. The `Math.min(tokens, bucketMax)` ceiling prevents overflow but doesn't correct underfill drift. Similarly, the leaky-bucket particle system decrements `life -= 0.015` per frame, and after ~66 frames the accumulated error means particles don't die at exactly `life === 0` — they die at `life === -0.00...something`, which the `> 0` filter catches but which means particle lifetimes vary by 1–2 frames. For token counts, periodically snap to integer values or use integer arithmetic with a scaling factor.

**Capacity resize races** occur when users adjust parameters mid-simulation. Reducing `bucketMax` while `tokens > newMax` requires explicit clamping (`tokens = Math.min(tokens, bucketMax)`), which the token-bucket app handles — but the leaky-bucket app does *not* truncate its queue when `queueMax` decreases, allowing the queue to temporarily exceed capacity until items leak out naturally. This creates a window where the visualized state contradicts the configured limit. The sliding-window variant has a subtler version: changing `ep.limit` doesn't retroactively deny already-admitted requests in the window, so a limit reduction from 20 to 5 still shows 15+ active requests until the window naturally expires. The fix is to either drain/reject excess entries on parameter change or clearly communicate that new limits apply only to future requests.
