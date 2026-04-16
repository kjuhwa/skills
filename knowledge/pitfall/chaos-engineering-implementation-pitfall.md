---
name: chaos-engineering-implementation-pitfall
description: Chaos apps commonly mis-model abort semantics, propagation decay, and SLO window arithmetic — resulting in demos that mislead operators
category: pitfall
tags:
  - chaos
  - auto-loop
---

# chaos-engineering-implementation-pitfall

The most frequent bug in chaos engineering visualizations is **treating the abort boundary as a soft limit instead of a hard kill**. Operators expect that when blast radius crosses the declared boundary or SLO burn exceeds the threshold, the experiment halts — not that a red banner appears while fault injection continues. If your simulator keeps generating post-abort fault data, the burn-down curve will show continued degradation past t_abort, which is both physically wrong (the fault is gone) and actively harmful (it teaches operators that aborts don't actually work). Enforce abort in the data layer: truncate the fault phase at `min(t_planned_end, t_abort_triggered)` and splice the recovery tail onto whichever came first.

A second common failure is **uniform blast propagation** — applying the same fault magnitude to every downstream node. Real blast radius is asymmetric: a database latency fault hits write-heavy services hard but barely touches read-replica consumers; an availability-zone fault spares services with cross-AZ failover. If your topology graph shows every dependent turning red in lockstep, the pattern is wrong. Weight propagation by the actual dependency type (sync RPC vs async queue vs cache-with-fallback) and by observed pre-experiment traffic share from that upstream. A service that gets 2% of its requests from the faulted dependency should barely flicker.

The third pitfall is **SLO window arithmetic mistakes**. Error budgets are computed over rolling windows (typically 30d for availability, 1h for fast-burn detection), but demos often compute burn over the experiment duration only — which makes a 5-minute 50% error injection look catastrophic even though it consumes <1% of a 30d budget. Always show *both* the short-window fast-burn rate (triggers pages) and the long-window budget consumption (triggers rollback decisions). Conflating the two leads teams to over-react to brief fault injections or under-react to slow-burn regressions, exactly the opposite of what chaos engineering is supposed to teach.
