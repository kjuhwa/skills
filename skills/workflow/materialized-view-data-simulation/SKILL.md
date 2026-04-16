---
name: materialized-view-data-simulation
description: Generating base-table write streams paired with refresh cycles to exercise staleness and divergence scenarios
category: workflow
triggers:
  - materialized view data simulation
tags:
  - auto-loop
version: 1.0.0
---

# materialized-view-data-simulation

Simulate a materialized view by generating two independent but correlated streams: a **base mutation stream** (Poisson-distributed inserts/updates/deletes against synthetic rows, with occasional bursts to stress the refresh window) and a **refresh trigger stream** (periodic ticks, commit-triggered events, or manual pulses). Seed the base table with a realistic cardinality (hundreds to low thousands of rows) so aggregations like SUM/COUNT/GROUP BY produce visibly changing numbers rather than noise-level jitter. Keep the projection function pure and deterministic — given the same base snapshot, re-running it must produce identical view output, otherwise divergence cannot be attributed to staleness.

Model three refresh strategies side-by-side in the same simulation so users can compare: **full recompute** (expensive, always fresh after tick), **incremental/delta** (cheap, accumulates error if change-log is lossy), and **lazy-on-read** (fresh per query, hides refresh cost inside read latency). Track per-strategy metrics — rows scanned, wall-clock cost, max staleness window, and query-read latency — and surface them as a comparative table. The teaching moment is the tradeoff curve: no strategy wins on all axes.

Inject controlled failure modes: dropped change-log entries (incremental goes silently wrong), refresh running longer than the interval (refreshes pile up or overlap), and writes arriving during refresh (consistency question: does the view snapshot the pre-refresh or post-refresh base?). These are the failure modes that make or break real deployments, so the simulator must let users toggle them on demand rather than waiting to stumble into them.
