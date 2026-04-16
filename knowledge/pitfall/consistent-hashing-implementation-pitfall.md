---
name: consistent-hashing-implementation-pitfall
description: Common implementation mistakes in consistent hashing — hash normalization, wraparound, single-vnode skew, and migration miscounting.
category: pitfall
tags:
  - consistent
  - auto-loop
---

# consistent-hashing-implementation-pitfall

The most subtle bug is the ring wraparound edge case. The clockwise-walk lookup must fall back to `sorted[0]` when no node hash is ≥ the key hash, because keys hashing above the highest node on the ring belong to the first node past the 0-boundary. All three apps implement this correctly, but it is easy to forget: omitting the fallback causes keys in the top arc of the ring to become unassigned or to silently default to an arbitrary node. A related mistake is inconsistent hash normalization — the ring app divides by `0xFFFFFFFF` to get `[0,1]`, the migration app uses raw 32-bit integers, and the load-test app uses `Math.imul` with unsigned shift. Mixing normalized and raw hash spaces in the same system (e.g., nodes hashed one way, keys another) silently breaks assignment correctness without any obvious error.

Running with a single virtual node per physical node (the default in the load-test app) produces dramatic skew — one node may receive 3–5× the keys of another even with a good hash function. This is the number-one production pitfall: teams implement consistent hashing for its minimal-migration property but ship with `vnodes=1`, then observe severe hot-spotting under load. The fix is mechanical (set vnodes to 100–200) but the failure mode is insidious because it only manifests statistically and may not surface in small-scale testing. Always load-test with realistic key volumes before shipping.

Migration cost is frequently miscalculated. The correct method is to compute full assignment maps under both the old and new topologies and diff per-key ownership — exactly as the migration app does. A common mistake is to estimate migration as `1/n` (the theoretical minimum for adding one node to n), but this only holds for a perfectly balanced ring with infinite virtual nodes. With real hash functions and finite vnodes, actual migration can be 20–40% higher than the theoretical minimum, especially when removing a node whose virtual nodes were clustered. Always measure empirically rather than relying on the textbook formula.
