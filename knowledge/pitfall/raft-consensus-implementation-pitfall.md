---
name: raft-consensus-implementation-pitfall
description: Common Raft simulation bugs around term updates, log matching, and commit index advancement
category: pitfall
tags:
  - raft
  - auto-loop
---

# raft-consensus-implementation-pitfall

The most frequent bug in Raft educational simulators is advancing `commitIndex` based on the leader's own log length rather than on majority replication of entries from the **current term**. Raft explicitly forbids committing entries from previous terms by counting replicas — the leader must replicate an entry from its own term and only then can it mark prior-term entries committed via the log-matching property. Simulators that skip this check will show "committed" entries that real Raft would refuse to commit, misleading learners about the figure-8 anomaly Diego Ongaro's paper warns about.

A second pitfall is failing to reset `votedFor` to null when a node observes a higher term. Every RPC handler (both send and receive paths) must check "if RPC term > currentTerm: currentTerm = term, votedFor = null, state = Follower" **before** processing the RPC body. Skipping this on the send path causes candidates to refuse to step down when they see a newer leader, producing phantom split-brain states that cannot occur in correct implementations.

Finally, log-replication visualizations often conflate `matchIndex` and `nextIndex`. `nextIndex` is optimistic (what the leader will try to send next) and decrements on AppendEntries failure; `matchIndex` is pessimistic (what is confirmed replicated) and only advances on success. Rendering a single pointer per follower hides the gap where log reconciliation happens, which is precisely the mechanism learners need to see when a stale follower rejoins after a partition.
