---
name: retry-strategy-implementation-pitfall
description: Common retry strategy bugs including thundering herd from missing jitter, uncapped exponential overflow, and misleading visual-time mappings.
category: pitfall
tags:
  - retry
  - auto-loop
---

# retry-strategy-implementation-pitfall

The most dangerous pitfall is the **thundering herd from deterministic backoff**. The simulator app's fixed-delay and linear strategies produce identical retry timing across all 20 concurrent requests — in production, this means N callers all retry at exactly `t + 500ms`, slamming the recovering server simultaneously. The timeline racer demonstrates the fix: jittered exponential uses `delay × (0.5 + random × 0.5)` to spread retries across a half-window, but this specific implementation only jitters downward from the base delay (0.5x–1.0x range) rather than symmetrically (0.5x–1.5x), which biases retries earlier than intended and provides less spread than full jitter. The "equal jitter" variant (`delay/2 + random × delay/2`) or AWS-style "decorrelated jitter" (`min(cap, random_between(base, previous_delay × 3))`) provide better de-correlation in multi-client scenarios.

The second pitfall is **uncapped exponential growth**. All three apps use `Math.min(base × 2^attempt, cap)` to prevent delay overflow, but the cap values (8000–10000ms) are hardcoded constants. In production, forgetting the cap means attempt 20 yields `200 × 2^20 = 209 seconds` — a single request blocks for 3.5 minutes. The budget dashboard exposes a subtler variant: its reset-at-80% policy (`budgetUsed = Math.floor(BUDGET_MAX * 0.2)`) creates a sawtooth pattern where the budget abruptly drops from 50 to 10, allowing a burst of retries right after the system was already overloaded. A smoother decay (exponential cooldown or token-bucket refill at a fixed rate) prevents the post-reset surge.

The third pitfall is **visual-time deception** in the timeline racer. The animated blocks use `setTimeout(step, 300)` as a fixed animation pace regardless of the actual simulated delay — a 8000ms exponential wait and a 500ms fixed wait both animate over the same 300ms real-time interval. The block width scales with `wait/40` to hint at relative duration, but users watching the animation perceive wall-clock racing speed, not simulated time, which can lead to incorrect conclusions about strategy performance. Any retry visualization must either run in real proportional time (impractical for long delays) or clearly label that animation speed is not proportional to simulated delay, using numeric annotations (the `Math.round(wait) + 'ms'` text inside wait blocks) as the authoritative comparison rather than visual block width.
