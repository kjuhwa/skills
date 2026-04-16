---
name: consistent-hashing-implementation-pitfall
description: Common correctness and performance traps when implementing consistent hashing in JavaScript browser apps.
category: pitfall
tags:
  - consistent
  - auto-loop
---

# consistent-hashing-implementation-pitfall

The most dangerous pitfall is using a naïve hash function with a small output range. The ring app uses `hash = (h * 31 + charCode) % 360`, which maps to only 360 positions — with 8+ nodes and dozens of keys, collisions and clustering become severe, creating visually misleading "even" distributions that would fail in production. The load simulator correctly uses FNV-1a with a full 32-bit range and 150 virtual nodes to compensate, while the migration app uses DJB2 (`h = (h << 5) + h + charCode`) but limits to `% 1000`, which is still dangerously small for real workloads. When porting from visualization to production, always use a hash with at least 32-bit output space and avoid modular reduction to small ranges — use the full range and let virtual nodes handle distribution.

The second pitfall is the linear ring walk: all three apps find a key's owner by sorting the node array and scanning linearly (`for (const n of sorted) if (n.h >= h) return n`). This is O(N) per lookup (or O(V) with virtual nodes), which is fine for 12 nodes but breaks down at scale. The load app's inner loop does `150 vnodes × 12 nodes = 1,800` comparisons per key lookup, multiplied by 200 keys = 360,000 comparisons per simulation tick. For production, replace the sorted array with a binary search (`findIndex` on pre-sorted positions) or a TreeMap-style structure. Also, all three apps re-sort the node array on every single key lookup instead of maintaining a pre-sorted structure — a hot-path allocation that causes GC pressure with large key sets.

The third pitfall is ignoring the wrap-around edge case inconsistently. All three apps handle it (`return sorted[0]` when no node has hash >= key hash), but the migration app's before/after ownership diffing compares owner IDs with `!==` where `owner(k.h)` can return `null` if all nodes are removed, producing a `null?.id` that silently becomes `undefined`. This means removing the last node doesn't flag any keys as "migrated" — the moved Set stays empty — because `undefined !== undefined` is false. Any ownership-tracking system must explicitly handle the zero-node degenerate case, or migration counts will silently under-report when the cluster drains completely.
