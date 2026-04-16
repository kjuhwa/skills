---
name: read-replica-data-simulation
description: Synthetic replication-log generator with configurable lag distributions and consistency violation injection
category: workflow
triggers:
  - read replica data simulation
tags:
  - auto-loop
version: 1.0.0
---

# read-replica-data-simulation

To demo or test read-replica behavior without a real database cluster, generate a synthetic write-ahead log (WAL) as a monotonically increasing sequence of LSN-tagged events (`{lsn, key, value, txTime}`) on the primary at a configurable write rate (e.g., 50–500 writes/sec). Each replica maintains its own `appliedLsn` cursor that advances toward the primary's `currentLsn` with a per-replica lag sampled from a distribution — not a constant. Use a lognormal or gamma distribution (mean 20ms, p99 500ms) to mimic real replication jitter; constant-lag simulations hide the tail-latency bugs that matter in production.

Build three injectable scenarios on top of the base generator: (1) **lag spike** — freeze a replica's `appliedLsn` for N seconds to simulate a slow apply thread or network blip; (2) **replica failover** — stop advancing the primary, promote a replica (its `appliedLsn` becomes the new `currentLsn`), and force others to rebase, exposing lost-write windows; (3) **read-your-writes violation** — route a write to the primary, then immediately route the follow-up read to a lagging replica and verify the stale response is surfaced. These three cover 90% of the failure modes operators care about.

Expose the simulation as a pure function of `(seed, config, t)` so the same scenario replays identically — crucial for the consistency-simulator variant where users step forward frame-by-frame to study a specific anomaly. Keep the event log bounded (ring buffer of ~10k events) so long-running sessions don't leak memory, and emit a structured event stream (`replica.lag.changed`, `read.stale`, `write.committed`) that the visualization layer subscribes to rather than polling replica state.
