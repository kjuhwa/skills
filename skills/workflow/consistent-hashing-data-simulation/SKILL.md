---

name: consistent-hashing-data-simulation
description: Workflow for generating reproducible node/key datasets and rebalance event streams for consistent-hashing demos
category: workflow
triggers:
  - consistent hashing data simulation
tags: [workflow, consistent, hashing, data, simulation, node]
version: 1.0.0
---

# consistent-hashing-data-simulation

Simulation data for consistent-hashing apps has three layers: (1) the **node set** — a list of `{id, weight, vnodeCount}` where weight drives replica multiplication (e.g., a node with weight=2 gets 2×vnodeCount virtual nodes); (2) the **key stream** — generate 10k–100k keys with realistic shapes like `user:{uuid}`, `session:{id}`, `obj:{sha1}` rather than sequential integers, so hash distribution reflects production-like entropy; (3) the **event timeline** — a scripted sequence of `ADD_NODE`, `REMOVE_NODE`, `REWEIGHT`, `SCALE_VNODES` events with timestamps, driving the rebalance-simulator's playback controls.

Precompute assignments once per ring state using a sorted vnode array and binary search for lookup (`O(log V)` per key where V = total vnodes). Cache the `{ringHash → nodeId}` map and only recompute the affected arc on node changes — for an ADD, only keys whose hash falls between the new node's predecessor and the new node itself change ownership. This invariant is the teaching moment: expose the migration count metric (`keysMovedThisEvent`) and the theoretical bound (`~N/M` where N=keys, M=nodes) side-by-side so users see consistent hashing's `O(K/n)` movement property vs. modulo hashing's `O(K)`.

Export simulation state as JSON snapshots (`{seed, nodes, events, ringSnapshot}`) so users can share scenarios. Include preset scenarios: "balanced 5 nodes, 150 vnodes each," "heterogeneous weights," "cascading failure (remove 3 nodes in sequence)," and "vnode sweep 1→500" to demonstrate how replica count flattens the load variance curve.
