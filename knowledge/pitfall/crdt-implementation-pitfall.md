---
name: crdt-implementation-pitfall
description: Common correctness bugs that break CRDT convergence guarantees in demo implementations
category: pitfall
tags:
  - crdt
  - auto-loop
---

# crdt-implementation-pitfall

The most frequent CRDT demo bug is using wall-clock timestamps or insertion order as the tiebreaker in OR-Set or LWW registers. Two replicas producing the same timestamp (trivial at ms resolution under fast clicks) break commutativity and the replicas stop converging. Always pair a logical clock or Lamport timestamp with a stable replica ID as the tiebreaker — `(lamport, replicaId)` is totally ordered and deterministic across replicas. Similarly, OR-Set adds must carry a *unique* tag (uuid or `(replicaId, counter)` dot), not the element value itself — otherwise remove propagates to future re-adds and the semantics degrade to LWW-Set.

Text CRDT demos frequently mishandle the position identifier generation: using floating-point "fractional indexing" naively (midpoint of neighbors) exhausts mantissa precision after ~50 concurrent insertions between the same two characters and collapses to equal IDs. Use arbitrary-precision string positions (LSEQ, Logoot) or integer-pair positions with explicit rebalancing. Also, never delete tombstones on local remove — only a garbage-collection pass with causal-stability proof across all replicas can safely prune them, which is out of scope for demos, so tombstones must persist for the session.

Counter CRDTs look trivially correct but break when the "merge" step takes the max per replica incorrectly — PN-Counter needs two separate G-Counter vectors (P and N) and merges each with max independently. Taking max of the *net* value per replica silently loses decrements. Finally, any merge function must be idempotent: replaying the same delivered op (due to gossip retransmission) must not double-count. Verify idempotency explicitly with a "deliver twice" test button, since subtle bugs here only surface under lossy networks.
