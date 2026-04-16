---
name: pub-sub-implementation-pitfall
description: Common failure modes in pub-sub visualizations — unbounded fan-out, particle leaks, stale subscription rendering, and interval drift.
category: pitfall
tags:
  - pub
  - auto-loop
---

# pub-sub-implementation-pitfall

The most dangerous pitfall across all three apps is **unbounded fan-out amplification**. When a particle reaches the broker, it spawns one child per matching subscriber. If a topic has N subscribers and the publish interval is fast (600ms in the constellation), the particle array grows at `publish_rate × N` per second. The constellation fires pulses to 4 subscribers per topic at ~1.7 publishes/sec, producing ~7 new particles/sec/topic — across 5 topics that is 35 particles/sec. Each particle lives ~40 frames (1/0.025), so steady-state is ~1400 concurrent particles. This is manageable, but adding more topics or subscribers without adjusting the interval or particle speed causes quadratic growth. The flow-canvas compounds this by not deduplicating the "done" → fan-out transition: if `update()` runs before the parent is filtered out, it can double-spawn children. A guard flag (`p.fanned = true`) is missing from all three implementations.

**Particle and DOM leaks** are the second pitfall. The canvas apps filter by `phase !== 'done'` or `t < 1`, but floating-point accumulation means `progress` might skip past exactly 1.0 if the increment doesn't divide evenly — `0.02 × 50 = 1.0` works, but `0.025 × 40 = 1.0` also works only by luck. A safer guard is `t >= 1` rather than `t === 1`. The topic-board's `col.el.children.length > 20` check only removes one child per publish, so a burst of rapid publishes can temporarily exceed the cap. Using a `while` loop instead of `if` would be more robust.

**Stale subscription rendering** is a subtler issue. None of the apps support dynamic subscribe/unsubscribe — the subscriber list is hardcoded at init. If you extend these demos to allow adding or removing subscribers at runtime, the connection lines and fan-out logic must be re-evaluated each frame, not cached. The constellation draws connections by iterating all pub-sub pairs every frame (correct but O(N²)), while the flow-canvas draws static lines from broker to fixed subscriber positions (breaks if subscribers move). Finally, `setInterval` drift is a real concern: under heavy rendering load, the browser may delay interval callbacks, causing bursty message clusters rather than smooth throughput — using `setTimeout` chained from `requestAnimationFrame` gives more consistent visual pacing.
