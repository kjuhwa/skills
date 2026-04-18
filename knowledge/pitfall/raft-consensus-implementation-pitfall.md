---
version: 0.1.0-draft
name: raft-consensus-implementation-pitfall
description: Common correctness bugs when modeling or implementing Raft, especially around term handling and commit safety
category: pitfall
tags:
  - raft
  - auto-loop
---

# raft-consensus-implementation-pitfall

The most frequent Raft bug is incorrect term handling on RPC receipt: any node receiving an RPC with a higher term MUST immediately step down to follower and update currentTerm BEFORE processing the RPC body. Simulations that only update term on successful vote/append miss this and produce impossible states like two leaders in the same term. Similarly, a candidate receiving an AppendEntries from the current term must step down — skipping this creates phantom candidates that never resolve.

Commit-index safety is the second major trap: a leader may only advance commitIndex for entries from its OWN current term (the "Figure 8" problem in the Raft paper). Advancing commitIndex purely by majority replication, without the current-term check, allows committed entries to be overwritten — a silent data-loss bug that won't surface in happy-path demos but breaks under leader churn. Visualizations that don't model this correctly give viewers a dangerously simplified mental model.

Third, election timeout randomization must be per-node and re-randomized on every reset, not a single cluster-wide value. A common simulation shortcut uses fixed timeouts which makes split-vote impossible to demonstrate and understates how timing-sensitive convergence actually is. Also beware of log matching: AppendEntries consistency checks must compare both index AND term of prevLogIndex — comparing only index allows divergent logs to be silently accepted, which is the whole reason the term field exists in log entries.
