---
name: backpressure-implementation-pitfall
description: Common failure modes when implementing backpressure: unbounded queues, invisible feedback signals, and simulation-reality divergence.
category: pitfall
tags:
  - backpressure
  - auto-loop
---

# backpressure-implementation-pitfall

The most dangerous pitfall visible across these apps is **the absence of backpressure as a default**. The pipeline app makes this explicit with a checkbox toggle — when backpressure is disabled, the producer fires at full rate regardless of queue depth, and the `dropped` counter climbs silently. In production systems, the equivalent is an unbounded queue or a fire-and-forget producer: the failure is invisible until memory is exhausted or latency spikes. The fix shown here — gating effective rate on `consumerRate + remainingCapacity / k` — must be the *default* path, not an opt-in. A second pitfall is **missing the feedback-signal visualization**. The pipeline app only draws the "slow down" arrow when the queue exceeds 50%, but the wave app shows that pressure begins propagating immediately at any nonzero delta. If your monitoring dashboard only alerts at a high threshold (like the dashboard's 80% "BACKPRESSURE" label), you miss the early build-up phase entirely. The 50% "BUILDING" state in the dashboard is essential — without it, operators have no lead time. A third pitfall is **confusing simulation damping with real-world drain**. The wave app applies `p -= releaseRate * 0.3` uniformly and the dashboard applies `queue -= random(0..5)` as "natural drain" — convenient for keeping demos stable, but in production there is no natural drain. Queue depth only decreases when a consumer actually processes an item. Simulations that include artificial decay will underestimate how quickly queues saturate under sustained load, leading to undersized buffers and delayed scaling decisions.
