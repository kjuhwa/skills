---
name: raft-consensus-implementation-pitfall
description: Common Raft implementation bugs around split-brain quorum counting, stale-term vote grants, and commit index advancement that cause safety violations.
category: pitfall
tags:
  - raft
  - auto-loop
---

# raft-consensus-implementation-pitfall

The most dangerous pitfall is incorrect quorum calculation when nodes go offline. In these implementations, majority is computed against *alive* nodes (`nodes.filter(n => n.state !== STATES.DEAD).length`), which is a simplification — real Raft computes majority against the *configured cluster size*, not the live count. If you compute against live nodes, a 2-node partition of a 5-node cluster can elect a leader with just 2 votes (>50% of 3 alive), while the other partition also elects a leader with 2 votes (>50% of 3 alive), causing split-brain. The fix is `votes > TOTAL_CLUSTER_SIZE / 2` regardless of how many nodes are reachable. Similarly, `commitIndex` must never advance for entries from a prior term — only the current term's entries can be safely committed, and prior entries piggyback on that commitment.

Vote granting without proper term fencing causes stale elections to succeed. The check `m.term >= m.to.term` is necessary but not sufficient: a node must also verify it hasn't already voted for a *different* candidate in the same term. The simplified `votedFor === null || votedFor === candidate.id` check works in single-threaded simulation but in real systems, the votedFor state must be persisted to stable storage before responding — a crash between granting the vote and persisting it can lead to double-voting after restart. Additionally, candidates that discover a higher term in any incoming message must immediately step down to follower, not just ignore the message. Failing to do so allows zombie candidates to accumulate votes across terms.

The heartbeat/election timeout relationship is subtle and frequently misconfigured. The election timeout (150-300ms in simulation) must be significantly larger than the heartbeat interval (50 ticks here) to avoid spurious elections — the rule of thumb is `electionTimeout >= 10 * heartbeatInterval`. In the log replication layer, the staggered replication delay can mask a critical bug: if a leader crashes mid-replication (after 2 of 4 followers received the entry), the entry is not committed, but those 2 followers have it in their logs. A new leader must reconcile by truncating or overwriting divergent log suffixes. The simplified simulation skips log conflict resolution entirely, which hides the most complex part of Raft — the leader must compare its log against each follower's and force-overwrite any entries after the last matching index/term pair.
