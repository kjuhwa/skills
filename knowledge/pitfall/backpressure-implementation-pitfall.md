---
name: backpressure-implementation-pitfall
description: Common mistakes when modeling backpressure — missing hysteresis, unbounded buffers, and conflating flow-control with rate-limiting.
category: pitfall
tags:
  - backpressure
  - auto-loop
---

# backpressure-implementation-pitfall

The most common pitfall is **no hysteresis on the pause/resume threshold**: if pause and resume both trigger at 80%, the system flaps — pause, drain one item, resume, fill one item, pause — producing a visually jittery simulation and, in real systems, thrashing that destroys throughput. Always separate the thresholds (pause high, resume low) and make the gap configurable. Related: forgetting that the resume signal has propagation latency in real systems; adding an artificial delay of 1–2 ticks before the producer actually resumes teaches viewers why buffers need headroom above the pause line.

The second pitfall is **unbounded internal state masquerading as a bounded buffer**. If the queue is implemented as a plain array that grows, and the "capacity" is only enforced visually, the simulation will not actually exhibit backpressure — it will exhibit infinite memory growth with a misleading UI. Enforce capacity at the data layer: reject/drop/block on enqueue, not on render. The conveyor-belt-jam app hit this bug early — items kept accumulating off-screen while the visible belt looked fine, and consumer drain times grew unboundedly because the array length was real even if the sprites weren't drawn.

The third pitfall is **conflating backpressure with rate limiting**. Rate limiting caps the producer unconditionally; backpressure caps the producer *based on downstream state*. A simulation that throttles the producer to a fixed rate regardless of buffer fill is not demonstrating backpressure — it is demonstrating a token bucket. The distinguishing test: if the consumer speeds up, does the producer automatically speed up too (up to its natural rate)? If not, the feedback loop is broken and you've built a rate limiter with a queue. Make the producer's effective rate a function of the pause signal, not a fixed config, and verify by dragging consumer rate up mid-run.
