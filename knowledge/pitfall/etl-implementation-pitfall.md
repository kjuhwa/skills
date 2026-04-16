---
name: etl-implementation-pitfall
description: Common pitfalls when building ETL pipeline UIs — error masking, counter drift, and unbounded state growth.
category: pitfall
tags:
  - etl
  - auto-loop
---

# etl-implementation-pitfall

The most critical pitfall visible across these three apps is **error masking in the happy path**. The data-flow app only detects errors at stage 2 (transform), but increments the error counter at the same time as the transform counter (`if(p.err && p.stage===2) counts.Err++`). Because stage progression checks are sequential `if` statements rather than exclusive branches, an error particle still advances to stage 3 (load) and gets counted as loaded. In a real ETL dashboard, this means the "Loaded" KPI would include rows that actually failed validation — a dangerous false confidence signal. The fix is to halt error particles at their failure stage and exclude them from downstream counters, but this gets missed when stage-transition logic is written as simple position-threshold checks rather than explicit state machines.

The second pitfall is **unbounded state accumulation**. The pipeline-viz stores every node and link in flat arrays with no cleanup, and the dashboard's `tput` counter grows monotonically (it adds `rows/60` per job but never decays). After hours of simulated runtime, `tput` inflates to meaningless values because it represents cumulative sum divided by job count rather than a true sliding-window rate. The data-flow app handles this better by filtering dead particles (`alpha > 0`), but the dashboard's history buffer (`push/shift` on a 30-element array) silently drops old data without adjusting dependent aggregates. When building ETL monitoring UIs, always use a bounded time-window for rate metrics (e.g., sum of rows in the last 60 seconds divided by 60) and periodically prune completed/stale pipeline graph nodes.

The third pitfall is **missing backpressure visualization**. All three apps treat stages as independent — data flows from extract to transform to load at particle speed with no concept of a stage being "full" or "slow." In real ETL systems, a slow transform stage causes extract backpressure and queue buildup, which is the single most common operational issue. None of these apps visualize queue depth between stages or show a stage bottlenecking. When designing ETL UIs, insert an explicit queue/buffer element between each stage pair, render its depth visually (e.g., a bar that fills up), and slow upstream particle emission when the downstream queue exceeds a threshold — this turns the visualization from a pretty animation into a genuine operational diagnostic tool.
