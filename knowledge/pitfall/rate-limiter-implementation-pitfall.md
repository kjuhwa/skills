---
name: rate-limiter-implementation-pitfall
description: Common bugs in client-side rate limiter simulations — timer drift, unclamped tokens, and window boundary errors.
category: pitfall
tags:
  - rate
  - auto-loop
---

# rate-limiter-implementation-pitfall

The most insidious bug across these implementations is **refill timer drift**. The bucket app uses `setInterval(() => { tokens++; }, 1000/refillPerSec)` but `setInterval` does not guarantee precise timing — under heavy DOM updates or tab backgrounding, the actual refill rate diverges from the configured rate. The visualizer solves this correctly with `requestAnimationFrame` and `tokens += refillRate * dt`, but mixing both patterns (as the bucket app does with a separate `setInterval` auto-fire alongside the refill timer) creates race conditions where a request fires between a refill tick, showing briefly negative visual state. The fix is to unify all state mutation into a single `requestAnimationFrame` loop or use `performance.now()`-based elapsed time for all calculations.

A second pitfall is **unclamped token state after parameter changes**. When a user drags the bucket-size slider downward, `maxTokens` decreases but `tokens` may still hold the old, larger value. All four apps handle this with `tokens = Math.min(tokens, maxTokens)`, but forgetting this clamp causes the bucket visualization to overflow — drawing token circles outside the bucket rectangle or computing a fill-height greater than 100%. Similarly, in the sliding window playground, changing `windowSize` or `maxReq` mid-simulation doesn't retroactively re-evaluate past requests, so the counter display can momentarily show "9 / 8 in window" if the max was just lowered. The window filter must re-run on parameter change, not only on new requests.

A third issue is **DOM log accumulation**. The visualizer caps log entries at 50, but the bucket app has no cap — after minutes of auto-fire, the DOM holds thousands of `<span>` elements, causing layout thrash and memory growth. Rate limiter demos generate high-frequency events by design, so any DOM log must enforce a ceiling. The dashboard avoids this entirely by using `innerHTML` replacement per tick rather than appending, trading individual-entry animation for bounded memory — the right tradeoff for a monitoring-style view.
