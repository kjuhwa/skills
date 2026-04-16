---
name: database-sharding-implementation-pitfall
description: Common traps in shard routing, hash distribution, and rebalance operations that cause data skew, split-brain, and costly resharding.
category: pitfall
tags:
  - database
  - auto-loop
---

# database-sharding-implementation-pitfall

**Naive hash-mod routing breaks on shard count changes.** The `charCodeSum % SHARDS` approach used in simple shard routers means that adding or removing a single shard remaps nearly every key to a different shard — in a 5-shard cluster growing to 6, approximately 83% of keys change ownership, requiring massive data migration. Production systems must use consistent hashing or virtual nodes to limit remapping to `~K/N` keys (where K is total keys, N is node count). The shard-flow-visualizer's hash function is also dangerously simplistic: summing character codes produces collisions for anagrams ("abc" and "bca" route identically), and the range-based strategy's `parseInt(key, 36) / 1e8` creates uneven bucket sizes because base-36 key space isn't uniformly distributed across the divisor.

**Rebalancing without movement cost accounting leads to cascading failures.** The rebalancer-sim's `distribute()` function computes the ideal end-state but doesn't model the transfer bandwidth, lock contention, or replication lag that occurs while records are in flight. In production, a rebalance of 10,000 records across 3 shards means cross-network data copies that compete with live traffic. The simulation's instant rebalance hides the most dangerous phase: the window where some clients read stale routing metadata and send writes to the old shard while migration is in progress, causing split-brain inconsistencies. Always implement a two-phase approach — mark the shard as "draining" (reject new writes) before moving data, then update the routing table atomically.

**Hot-spot detection thresholds require tuning per cluster size.** The 1.4x-average threshold used to flag "hot" shards works for 3-5 shards but produces false negatives at scale — in a 100-shard cluster, one shard holding 1.39x average is already severely overloaded. The threshold should scale inversely with shard count (e.g., `1 + 1/(sqrt(N))`). Additionally, the DJB2 hash mod 360 in the consistent-hash-ring produces visible clustering because 360 has many small factors — production rings use 2^32 or 2^64 ranges with 100-200 virtual nodes per physical node to achieve statistical uniformity. Without virtual nodes, 3 physical nodes on a 360-point ring can easily create a partition where one node owns 180+ degrees of the key space.
