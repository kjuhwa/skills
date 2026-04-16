---
name: materialized-view-data-simulation
description: Generate realistic MV lifecycle data including refresh cycles, staleness propagation, row-count drift, and latency distributions for testing monitoring UIs.
category: workflow
triggers:
  - materialized view data simulation
tags:
  - auto-loop
version: 1.0.0
---

# materialized-view-data-simulation

The refresh-cycle simulation models each materialized view as a state machine with three states — `ok`, `refreshing`, and `stale` — driven by a per-view configurable interval (20s–120s). On each tick the elapsed counter increments; when it reaches the refresh interval, the view transitions to `refreshing` with 85% probability or `stale` with 15%, simulating real-world refresh failures (lock contention, source unavailability). The refreshing state lasts a fixed 2-second window, after which the view returns to `ok`, its row count increments by a small random delta (`Math.random() * 10`), and a new refresh duration (150–1050ms) is pushed onto a 20-element ring buffer that feeds the sparkline. This produces realistic-looking telemetry with occasional staleness spikes and gradually growing row counts without requiring a real database.

The DAG simulation pre-seeds a dependency graph with heterogeneous node types — base tables with static row counts (2.4K–80K), MVs with defining SQL fragments and boolean staleness flags, and downstream live views. Dependencies are expressed as an array of parent IDs on each node, from which directed edges are computed at init time. A "Refresh All" action clears all stale flags, then re-introduces a stale node after a 4-second delay, simulating the real operational pattern where refreshing one view can reveal staleness in another due to data drift. Layouts are computed by bucketing nodes into type-based columns and distributing them vertically with equal spacing.

The query-diff simulator generates tabular result sets on the fly using parameterized generator functions: revenue queries produce 12 rows of `(date, dollar_amount, order_count)` with randomized values anchored to plausible ranges ($8K–$12K daily revenue, 120–200 orders), while top-product queries produce 10 ranked rows across 5 categories with descending sold counts. Base-table latency is sampled uniformly from 800–2000ms and MV latency from 2–17ms, producing a consistent 50–1000× speedup that matches real-world MV performance characteristics. Query pairs rotate automatically every 25 seconds, ensuring the simulation covers multiple aggregation patterns (SUM, RANK, COUNT DISTINCT) without manual intervention.
