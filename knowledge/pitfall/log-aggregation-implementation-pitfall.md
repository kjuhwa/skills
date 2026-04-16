---
name: log-aggregation-implementation-pitfall
description: Common failure modes when building log aggregation dashboards — DOM explosion, timer drift, bucket misalignment, and misleading simulated data.
category: pitfall
tags:
  - log
  - auto-loop
---

# log-aggregation-implementation-pitfall

The most dangerous pitfall in live log-stream UIs is **unbounded DOM growth**. Each incoming log line creates a DOM node; at 6–7 entries per second, an uncapped feed reaches 25,000 nodes per hour, causing layout thrash, rising memory, and eventual tab crash. The mitigation is a hard eviction cap (e.g., 200 nodes — remove `feed.lastChild` after each prepend), but the cap must be chosen carefully: too low and operators lose scroll-back context during incident triage, too high and low-spec monitoring terminals stutter. A related trap is **particle/SVG element leakage** in pipeline-flow views — if `requestAnimationFrame` removes finished particles from the JS array but fails to remove the corresponding SVG `circle` from the DOM (e.g., due to splice-index shift during iteration), ghost elements accumulate and degrade rendering. The pattern of `.querySelectorAll('.particle').forEach(remove)` on every frame is a brute-force fix that trades selector overhead for correctness; a pooling strategy (hide/reuse elements) is better at scale.

**Timer and bucket misalignment** is a subtler issue. The stream monitor uses one `setInterval` at 1s to rotate buckets and another at 150ms to add logs. Because `setInterval` is not guaranteed to fire precisely, bucket boundaries drift relative to wall-clock seconds, causing counts to bleed across buckets. Under heavy tab throttling (background tabs in Chrome cap timers to 1s), the 150ms log timer fires at 1s intervals instead, collapsing apparent log rate by ~7× and making the dashboard look falsely quiet — exactly when an operator might switch away during an incident. Mitigation: use `performance.now()` deltas rather than timer count, or accumulate into the bucket keyed by `Math.floor(Date.now() / 1000) % bucketCount` instead of relying on shift timing.

**Misleading simulation fidelity** is the most insidious pitfall. Power-law random generation produces plausible-looking heatmaps, but real log pattern distributions are highly correlated — a Timeout spike at 03:00 usually co-occurs with DBSlow and QueueFull in the same window, because they share a root cause (e.g., a deployment or network partition). Independent random generation per cell masks this correlation, so dashboards tested only against synthetic data will lack cross-pattern highlighting, co-occurrence overlays, or root-cause grouping features that operators actually need. Similarly, simulated pipeline throughput with uniform random particle speed gives no sense of backpressure — in reality, when the processing stage slows, the collector stage's output queue grows and eventually drops events, a cascade that the particle model doesn't represent. Before shipping, always validate visualizations against a replayed production log sample (e.g., a 1-hour Fluentd capture piped through a WebSocket) to surface these missing correlations.
