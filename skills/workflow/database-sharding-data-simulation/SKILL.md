---
name: database-sharding-data-simulation
description: Synthetic shard workload generation with hot-spot injection, dynamic shard scaling, and rebalance-triggered record redistribution.
category: workflow
triggers:
  - database sharding data simulation
tags:
  - auto-loop
version: 1.0.0
---

# database-sharding-data-simulation

Realistic shard simulation requires three data-generation strategies that mirror production failure modes. **Uniform seeding** uses `distribute(total)` to assign `floor(total/N)` records per shard with remainder distributed round-robin to the first `total % N` shards — this is the baseline "perfectly balanced" state. **Hot-spot injection** picks a random shard index and dumps the entire delta onto it when the user increases load via a slider, simulating the real-world scenario where a single tenant or hash range attracts disproportionate writes. **Key-hash scattering** generates random 6-character base-36 keys (`Math.random().toString(36).slice(2,8)`) and routes them through the active strategy function, producing organic skew patterns that differ visibly between hash-mod, range-partition, and round-robin — the hash approach clusters on charcode sums, range on `parseInt(key,36)/1e8`, and round-robin distributes perfectly.

The rebalance operation computes `totalRecords` across all shards, then calls `distribute()` to flatten, logging per-shard deltas (`+N`/`-N` records) so the user sees exactly how much data would move in a real resharding event. This diff-logging pattern is critical for teaching the cost of rebalancing — without it, users assume rebalancing is free. The "Add Shard" operation appends a zero-record shard and requires an explicit rebalance trigger, which correctly models that adding a node to a production cluster doesn't automatically redistribute data.

For the consistent-hash layer, simulation uses DJB2 hash (`h = ((h<<5)+h+charCode) & 0x7fffffff`) mod 360 to place both nodes and keys on the ring, then `findNode()` walks the sorted node list clockwise to assign ownership. Adding/removing nodes automatically reassigns only the affected key range — the simulation should highlight which keys change ownership on node mutations to demonstrate consistent hashing's minimal-disruption property versus naive hash-mod where every key potentially moves.
