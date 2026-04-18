---

name: database-sharding-data-simulation
description: Synthetic workload generator for sharding scenarios using skewed key distributions and configurable hash strategies
category: workflow
triggers:
  - database sharding data simulation
tags: [workflow, database, sharding, data, simulation, synthetic]
version: 1.0.0
---

# database-sharding-data-simulation

To realistically simulate sharded database traffic, generate keys from a mix of distributions rather than uniform random: 70% Zipfian (models real hot-key patterns like celebrity users or trending content), 20% uniform (baseline background traffic), and 10% temporal bursts (models flash-sale or viral events). Drive the simulator from a fixed-rate tick loop (e.g., 60Hz) that emits batches of N keys per tick, where N is user-configurable so operators can stress-test routing logic at 1k, 10k, or 100k keys/sec without changing the underlying code path. Each synthetic operation should carry `{key, opType, payloadSize, timestamp}` so downstream visualizations can differentiate reads from writes and small lookups from bulk scans.

Implement the routing layer as a pluggable strategy interface — `modulo`, `consistent-hash`, `rendezvous`, `range` — so the same key stream can be replayed against each algorithm for side-by-side comparison. Persist the generated key stream (or its seed) so rebalance scenarios are deterministic and reproducible; a random seed that changes every run makes it impossible to A/B compare "before adding shard" vs "after adding shard" load distributions. Track per-shard counters in a ring buffer of the last ~300 ticks to drive rolling-window graphs without unbounded memory growth.

Expose scenario presets as one-click buttons: "balanced baseline", "celebrity hot key" (95% of traffic to one key), "resharding in progress" (mid-migration double-writes), and "cascading failure" (shard drops trigger retries that amplify load on survivors). These presets encode the non-obvious scenarios that usually only surface in production, making them discoverable during exploration instead of requiring operators to know what parameters to dial in.
