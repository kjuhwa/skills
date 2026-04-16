---
name: consistent-hashing-implementation-pitfall
description: Virtual node count, hash function bias, and wrap-around bugs silently destroy consistent-hashing load balance
category: pitfall
tags:
  - consistent
  - auto-loop
---

# consistent-hashing-implementation-pitfall

The single most common bug is too few virtual nodes. With 1 vnode per physical node and 10 nodes, load variance routinely exceeds 3x — one node gets 45% of keys, another gets 3%. The fix is 100–200 vnodes per physical node (Cassandra uses 256, Dynamo uses ~128). Below 50 vnodes the ring is visibly lumpy in any honest visualizer; above 500 the sorted ring becomes slow to mutate on node churn. Default to 150 and expose the slider so users can see variance collapse as vnodes grow — this is both a real production tuning knob and the clearest teaching moment.

The second pitfall is hash function choice. `hashCode()` in JVM, `string.GetHashCode()` in .NET, and naive `sum(charCodes) % 2^32` all cluster badly — adjacent vnode ids like `node-a:0`, `node-a:1`, `node-a:2` end up at nearby angles, so one physical node owns a huge contiguous arc instead of scattered slivers. Use murmur3, xxhash, or FNV-1a (not cryptographic SHA — it's slow and the uniformity win is negligible here). Always hash the full `nodeId + ":" + vnodeIndex` string, never just concatenate numeric offsets to a base hash.

The third pitfall is the clockwise-wrap edge case. When a key's hash is greater than every vnode hash on the ring, lookup must wrap to the smallest vnode (index 0 of the sorted array), not return null or the last vnode. Off-by-one here causes ~1/N of keys to be misrouted, and because it only affects the highest-hashed keys the bug hides in averages — load distribution looks fine, but specific keys silently move to the wrong node on every lookup. Always unit-test with a key whose hash is deliberately above `max(vnodeHashes)` and assert it lands on the first vnode after wrap.
