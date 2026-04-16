---
name: chaos-engineering-implementation-pitfall
description: Common implementation pitfalls in chaos engineering tools including cascade modeling gaps, timing bugs, and missing safety controls.
category: pitfall
tags:
  - chaos
  - auto-loop
---

# chaos-engineering-implementation-pitfall

The most dangerous pitfall in chaos engineering implementations is **incomplete cascade modeling**. A blast radius calculator that only tracks direct dependencies will dramatically underestimate failure impact — you must compute the transitive closure via BFS/DFS on the reverse dependency graph. However, even correct graph traversal still misses real-world cascade patterns: latency faults should degrade downstream throughput (multiplicative effect), CPU spikes should compound latency (resource contention), and error rate spikes should trigger retry storms that further amplify load. Modeling each fault type in isolation produces misleadingly optimistic results. The three apps analyzed all treat fault effects as independent; production chaos tools must model cross-metric coupling.

The second major pitfall is **timing and state synchronization**. Simulations using `setInterval` for fault generation and `requestAnimationFrame` for rendering create two unsynchronized clocks. If a fault toggle event fires between a tick and a render, visual state diverges from data state. Decay-based animations (`pulse -= 0.02` per frame) assume 60fps — on slower devices, animations last longer and the visual timeline stretches. Use `deltaTime` scaling or CSS animations (which are GPU-composited and frame-rate-independent) instead. Recovery timers using `Date.now()` comparisons work but are non-deterministic, making scenario replay and automated testing impossible. Production implementations should use a seedable PRNG and a virtual clock for reproducibility.

The third pitfall is **missing safety controls around fault stacking**. All three apps allow unlimited simultaneous fault injection with no circuit breaker, no automatic rollback, and no blast radius cap. In a real chaos platform, this is catastrophic — injecting latency + errors + CPU + packet loss simultaneously in production can exceed the system's resilience envelope and cause genuine outages. Implementations must enforce a maximum concurrent fault count, require explicit acknowledgment for stacking faults, and provide an emergency kill-switch that instantly clears all active faults and returns to baseline. The severity classification (0=nominal, 1=degraded, 2+=critical) is a good start but should trigger automatic rollback at the critical threshold rather than being purely informational.
