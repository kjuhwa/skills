---
name: retry-strategy-implementation-pitfall
description: Common failure modes in retry implementations including thundering herd, unbounded retry storms, visual-time deception, and circuit-breaker state machine bugs.
category: pitfall
tags:
  - retry
  - auto-loop
---

# retry-strategy-implementation-pitfall

**Thundering herd and retry storms** are the most dangerous pitfall. When multiple clients retry on the same fixed schedule (e.g., all retry at exactly 1s, 2s, 4s), they synchronize and amplify load spikes on an already-struggling service. The apps demonstrate the fix: add proportional jitter (`delay * Math.random() * 0.3`) rather than fixed additive jitter (`delay + Math.random() * 400`). Proportional jitter scales with the backoff window—at attempt 5 with exponential backoff (16s base), 30% jitter spreads retries across a 4.8-second window, while a fixed 400ms jitter at the same point is negligible. App 85 uses fixed additive jitter which would fail to decorrelate clients at high retry counts in production—a subtle bug that looks correct in small demos but breaks under load. Additionally, without a max delay cap, exponential backoff grows unbounded: attempt 10 = `base * 1024`, attempt 20 = `base * 1,048,576`. Always clamp: `Math.min(calculatedDelay, MAX_DELAY)`.

**Circuit-breaker state machine bugs** cluster around three transitions. First, HALF_OPEN→OPEN must reset the failure counter, or the circuit immediately re-opens on the next tick even after a successful probe (app 86 handles this correctly by zeroing `failCount` on state entry). Second, OPEN duration must be bounded—if the cooldown timer never decrements (e.g., conditional branch skips the decrement when no requests arrive), the circuit stays open forever, causing a permanent outage that outlasts the original failure. Third, the HALF_OPEN state should test with exactly one probe request, not the full batch; sending 15 requests through a half-open circuit defeats the purpose of cautious probing. App 86's tick model processes the full batch in HALF_OPEN which is technically incorrect for production but acceptable for visualization.

**Visual-time deception** is a UX pitfall unique to retry demos. App 85 compresses delays by 3x (`delay/3`) for animation—necessary for usability, but if users interpret the visual as real timing, they'll underestimate how long exponential backoff actually takes. A 6-attempt exponential sequence with 500ms base totals 31.5 seconds in reality but appears to complete in ~10 seconds on screen. Always label visualizations with the simulated time (not wall-clock animation time) and show cumulative delay numerically alongside the animation. Similarly, forcing success on the last attempt (`|| attempt === maxRetries`) masks the real risk: in production, all retries can exhaust without success, and the system must handle total failure gracefully—not assume eventual success.
