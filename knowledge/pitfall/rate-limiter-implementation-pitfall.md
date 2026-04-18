---
version: 0.1.0-draft
name: rate-limiter-implementation-pitfall
description: Common correctness bugs in rate limiter algorithms that only surface under specific traffic patterns
category: pitfall
tags:
  - rate
  - auto-loop
---

# rate-limiter-implementation-pitfall

The **fixed-window double-allowance bug** is the most common rate limiter defect: a client hitting the limit at t=59s and again at t=60s gets 2x the intended rate because the counter resets at the boundary. Naive implementations pass unit tests (uniform traffic never triggers it) but fail in production. Sliding-window-counter fixes this by weighting the previous window's count by `(window_size - elapsed_in_current) / window_size` — but the weighting formula is easy to invert. Always test with the boundary-straddle scenario: 100 requests at t=59.9s + 100 at t=60.1s should reject ~50% under a 100/min limit, not accept all 200.

Token bucket implementations frequently mishandle the **lazy refill race condition**. Computing `tokens_to_add = (now - last_refill) * rate` on each request is correct, but storing `last_refill = now` before checking if the request fits creates a state where a rejected request still consumed "refill time" — subsequent bursts underperform. Fix: only update `last_refill` when tokens are actually granted, or clamp `tokens` to `capacity` before the consumption check. Also: floating-point token counts drift; prefer integer tokens with a sub-token accumulator, or millitokens.

For multi-tenant quota dashboards, the pitfall is **shared-clock skew under distributed limiters** — if two app nodes hold independent counters and sync every N seconds, a tenant can briefly exceed 2x the limit. Either use a central store (Redis INCR with TTL) accepting the round-trip cost, or accept the overshoot and document it. Never average counters across nodes: rate limits are about peaks, not means. The demo apps should surface this by letting users toggle "distributed mode" and watch the overshoot appear.
