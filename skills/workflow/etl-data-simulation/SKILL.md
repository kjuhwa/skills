---
name: etl-data-simulation
description: Generate synthetic ETL job events with realistic throughput, error rates, and stage-transition timing for UI prototyping.
category: workflow
triggers:
  - etl data simulation
tags:
  - auto-loop
version: 1.0.0
---

# etl-data-simulation

The three apps each generate synthetic ETL data differently but share core principles: randomized row counts within plausible ranges, a tunable error probability, and time-staggered event emission. The data-flow app spawns particles with `Math.random() < 0.08` for an 8% error rate and varies speed between 1.0–2.5x, producing natural clustering and spacing. The dashboard app picks from six realistic job names (`user_sync`, `order_ingest`, `log_archive`, `product_feed`, `event_stream`, `metrics_agg`), assigns random row counts between 1,000–51,000, and cycles through weighted statuses (4:1:1 success/failed/running). Both use `setInterval` or `requestAnimationFrame` loops to continuously emit events, simulating a live production pipeline.

To build a reusable ETL data simulator, define a job template registry mapping job names to row-count ranges and typical durations. Emit events on a Poisson-like schedule (the data-flow app uses `if(Math.random() < 0.3) spawn()` per frame, roughly 18 spawns/sec at 60fps). Each event should carry: job name, row count, status, stage timestamps, and an error flag. The error flag should be stage-aware — the data-flow app only manifests errors at the transform stage (stage index 2), reflecting the real-world pattern where most ETL failures occur during schema mapping, type coercion, or business-rule validation rather than during raw extraction or final load. Keep a running history buffer (the dashboard uses a 30-element sliding window via `push/shift`) for charting, and accumulate counters per stage for KPI panels.

For throughput simulation, derive rows/sec by dividing each job's row count by a synthetic duration (the dashboard uses 60 seconds). Apply a weighted random status distribution rather than uniform random — production ETL pipelines typically run at 85–95% success, 3–8% failure, and 2–7% in-progress at any snapshot. The dashboard's `statuses` array hard-codes this weighting (4 success, 1 failed, 1 running out of 6 entries ≈ 67% success), which is slightly pessimistic but useful for stress-testing error display paths.
