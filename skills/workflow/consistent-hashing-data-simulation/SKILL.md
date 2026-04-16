---
name: consistent-hashing-data-simulation
description: Generate deterministic key/node workloads and rebalance event streams for consistent-hashing demos without real backends
category: workflow
triggers:
  - consistent hashing data simulation
tags:
  - auto-loop
version: 1.0.0
---

# consistent-hashing-data-simulation

Consistent-hashing demos need three synthetic data streams: (1) a key corpus — generate 1k–100k keys as `user:{seeded-uuid}` or `session:{n}` with a seeded PRNG so reloads are reproducible; (2) a node roster with stable ids (`node-a`, `node-b`, ...) plus a join/leave event timeline; (3) a pre-computed ownership map `Map<keyHash, nodeId>` so the UI never hashes on the render path. Pre-hash every key once at load using the same function as the ring, store as `{key, hash, ownerIdx}` tuples, and sort by hash — ownership lookup becomes binary search instead of ring walk, keeping 60fps even with 100k keys.

For the rebalance simulator flow, model events as `{t, type: 'join'|'leave'|'query', target}` and replay them on a fixed tick. On each join/leave, diff the ownership map before/after and emit `moved_keys` and `stayed_keys` arrays — the game/simulator UI consumes these to animate only the deltas and to score the player (cache-cluster-game awards points for predicting which keys move). Load distribution samples should be taken at the end of every event, stored as `{t, nodeId, keyCount, loadPct}`, and streamed into a sparkline so imbalance emerges visually over time rather than as a single snapshot.

Use a shared `ConsistentHashRing` class across all three apps with methods `addNode(id, vnodes)`, `removeNode(id)`, `getOwner(key)`, `getOwnershipMap(keys)`, and `getLoadDistribution(keys)`. The simulation layer wraps this with `replay(events)` and `diff(before, after)` helpers. This keeps the game, visualizer, and simulator numerically consistent — a scenario that looks balanced in the visualizer will score identically in the game, which matters for trust when users toggle between apps.
