---
name: consistent-hashing-data-simulation
description: Generates synthetic key sets and compares modulo vs. consistent hashing for load distribution and remapping cost.
category: workflow
triggers:
  - consistent hashing data simulation
tags:
  - auto-loop
version: 1.0.0
---

# consistent-hashing-data-simulation

The simulation workflow begins by generating a deterministic key array (`Array.from({length: keyCount}, (_, i) => 'key-' + i)`) and hashing each key through FNV-1a (`h = 2166136261; h ^= charCode; h = (h * 16777619) >>> 0`). For modulo hashing the distribution is `bucket = fnv(key) % nodeCount`, producing a flat object `{nodeIndex: count}`. For consistent hashing, a virtual node ring is built by hashing `'n' + nodeIndex + 'v' + vnodeIndex` for 150 vnodes per physical node, sorting by position, then walking the ring for each key — the same clockwise-first-match used in the visualization layer. The 150 vnode count is the critical tuning parameter: too few vnodes create hot spots, too many slow ring construction and lookup.

The key comparison metric is standard deviation of the per-node key counts: `stddev = sqrt(Σ(count - avg)² / N)`. Modulo hashing has low stddev in a static cluster but catastrophic remapping on resize. The remapping measurement iterates all keys and counts how many change buckets: `keys.forEach(k => { if (fnv(k) % oldN !== fnv(k) % newN) modMoved++ })`. For consistent hashing, the theoretical ideal is `~keyCount / oldNodeCount` keys migrated, which the simulation reports as the expected value rather than the exact count. This side-by-side format — bar charts with per-node counts, stddev labels, and remapped-key counts — makes the O(K/N) migration advantage of consistent hashing immediately tangible.

The simulation uses configurable sliders (node count 2-12, key count 20-200) so users can explore edge cases: 2 nodes exposes maximum modulo churn (≈50% remapped), while 12 nodes shows that even modulo has decent static distribution but still remaps ~92% of keys on node removal. The "Remove 1 Node" action re-runs both algorithms at N-1 and updates the bars in-place, making the contrast between approaches visceral. All hashing uses `>>> 0` to force unsigned 32-bit integers, preventing negative hash values that would break modulo bucket assignment — a subtle but essential detail for JavaScript implementations.
