---
version: 0.1.0-draft
name: crdt-implementation-pitfall
description: Common CRDT bugs: naive LWW tiebreaking, OR-Set tag reuse, and counter double-counting on replay
category: pitfall
tags:
  - crdt
  - auto-loop
---

# crdt-implementation-pitfall

The most frequent CRDT bug is broken tie-breaking in LWW registers: using `Date.now()` alone produces ties on fast clients, and ties that fall back to "last received wins" break commutativity — two replicas receiving the same pair in opposite order will diverge permanently. Always pair the timestamp with a stable replicaId as a secondary sort key, and never use wall-clock time without a Lamport or hybrid-logical-clock component, since clock skew between clients silently corrupts ordering.

For OR-Sets, the classic mistake is reusing element tags across add operations on the same replica — an add/remove/add cycle must generate a fresh UUID for each add, otherwise the remove tombstone will incorrectly suppress the re-add. Similarly, do not garbage-collect tombstones without a causal stability protocol; a late-arriving message from a partitioned replica can resurrect "deleted" elements if tombstones are pruned too eagerly. Graph CRDTs compound this by needing to handle edge-refers-to-removed-node: choose either add-wins (resurrect the node) or remove-wins (drop the edge) and document the choice prominently.

G-Counters require that each replica only increments its own slot in the per-replica map; a common bug is merging by summing all slots from both sides, which double-counts. The correct merge is element-wise `max` of each replica's slot, then sum across slots for the observed value. Replay or re-delivery of the same increment op from the same replica with the same sequence number must be idempotent — use (replicaId, opSeq) deduplication at the merge boundary, not at the transport layer where retries are invisible.
