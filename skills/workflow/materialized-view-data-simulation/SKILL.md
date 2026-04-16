---
name: materialized-view-data-simulation
description: Generating synthetic base-table writes and refresh cycles to exercise materialized-view behaviors without a real warehouse
category: workflow
triggers:
  - materialized view data simulation
tags:
  - auto-loop
version: 1.0.0
---

# materialized-view-data-simulation

Simulate MV behavior with a two-clock model: a fast "write clock" driving base-table inserts/updates/deletes at a configurable rate (e.g., 10–500 ops/sec with Poisson jitter), and a slow "refresh clock" triggering either full-rebuild or incremental-merge strategies. Each synthetic base row carries a `version` and `updated_at` so the MV delta computation is deterministic and replayable from a seed. Model three refresh modes explicitly: `FULL` (O(n) scan, blocks queries in the sim), `INCREMENTAL` (apply changelog since `last_refresh_lsn`), and `CONCURRENT` (non-blocking but doubles memory). Expose knobs for base-table volume, write-skew, and refresh interval so users can reproduce refresh-storm and stale-read scenarios.

Seed the simulator with a realistic aggregation workload — `SUM`/`COUNT`/`AVG` over a partition key — because these are the MVs most often deployed in practice and their staleness semantics differ from pass-through projections. For staleness dashboards, inject periodic "burst write" episodes (5× baseline for 30s) to force the amber→red transition so users can observe threshold behavior. For query-planner sims, generate a fixed query catalog with known MV-eligibility so the planner's match/reject decisions are verifiable rather than random.

Record every event (write, refresh-start, refresh-end, query, staleness-threshold-crossed) in an append-only log keyed by simulated timestamp; this lets the UI scrub backward/forward through time and makes the simulation deterministic for screenshots and regression tests. Keep the simulation entirely in-memory with TypedArray-backed ring buffers — a real DB connection defeats the point and adds flaky-test surface area.
