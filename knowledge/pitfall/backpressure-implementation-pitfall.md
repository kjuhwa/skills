---
name: backpressure-implementation-pitfall
description: Common mistakes that make backpressure demos misleading or physically incorrect
category: pitfall
tags:
  - backpressure
  - auto-loop
---

# backpressure-implementation-pitfall

The most frequent pitfall is **coupling the producer directly to `setInterval` at a fixed rate** without a feedback channel—this produces a buffering animation, not backpressure. True backpressure requires the consumer (or buffer) to signal upstream, and the producer must observably react (pause, slow, or drop). If the producer's rate slider still works identically when the buffer is full, the simulation is lying. Always verify that `producer.emitted` per second actually decreases under the "block" strategy when the consumer is slower.

A second trap is **conflating buffer capacity with watermarks**. Many implementations trigger the "red" pressure state at 100% fill, but real systems apply backpressure at a high watermark (~80%) and release at a low watermark (~40%) to create hysteresis. Without hysteresis, the visualization thrashes between states every tick when rates are near-equal, which looks like a bug and misrepresents how reactive streams actually behave (Reactor, RxJS, Akka Streams all use watermark-based request signaling).

Third, **rate units drift silently**. If the producer slider says "100/s" but internally accumulates as `rate * frameDelta` without tracking leftover fractions, you'll lose or gain items over long runs, and the in/out totals won't reconcile. Always assert `produced == enqueued + blocked_rejections` and `enqueued == dequeued + dropped + currentDepth` at every tick in dev mode—these invariants catch 90% of simulation bugs. Also beware using `Math.random()` for Poisson arrivals without a seeded PRNG: users can't reproduce a pressure spike they just saw, which destroys the demo's teaching value.
