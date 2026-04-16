---
name: consistent-hashing-implementation-pitfall
description: Common correctness and distribution pitfalls when implementing consistent hashing rings and virtual nodes
category: pitfall
tags:
  - consistent
  - auto-loop
---

# consistent-hashing-implementation-pitfall

The most frequent bug is **weak hash function choice** for vnode labels. Developers often hash `nodeId + ":" + i` with a simple `string.hashCode()` or `sum of charCodes`, which clusters vnodes for adjacent `i` values into nearby ring positions, producing severe load skew. Always use a proper avalanche-property hash (MurmurHash3, xxHash, SHA-1 truncated to 32 bits) and hash the full composite string — not the node id plus an offset — so that vnode[i] and vnode[i+1] are statistically independent positions on the ring.

The second pitfall is **ring wraparound handling in lookup**. When searching for the first vnode with `hash >= keyHash`, if none exists (key hash falls past the last vnode), the lookup must wrap to index 0 — not return null or the last vnode. A binary search upper_bound followed by `idx % vnodes.length` is the canonical fix. Forgetting this causes a "dead arc" at the top of the ring where keys get misassigned or dropped entirely; it only manifests when keys hash into the narrow band above the maximum vnode hash, so test coverage often misses it until production.

The third pitfall is **too few virtual nodes**. With 1–10 vnodes per physical node, standard deviation of load can exceed 30% of the mean even for uniform keys — consistent hashing alone does not guarantee balance. The empirical rule is 100–200 vnodes per physical node to get variance under ~5%. Also beware that vnode count cannot be changed for an existing node without rehashing its entire key set, so pick a sufficiently high value upfront rather than scaling it later. Finally, removing a node must delete *all* its vnodes atomically before any key lookups re-run; a half-updated ring will route keys to a ghost node and fail silently until the next read.
