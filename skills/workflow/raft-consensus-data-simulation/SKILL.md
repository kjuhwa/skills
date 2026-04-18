---

name: raft-consensus-data-simulation
description: Deterministic event stream generation for Raft scenarios covering elections, replication, and term changes
category: workflow
triggers:
  - raft consensus data simulation
tags: [workflow, raft, consensus, data, simulation, replication]
version: 1.0.0
---

# raft-consensus-data-simulation

Raft simulation data should be generated as a deterministic event log seeded by scenario name, producing a sequence of typed events: ElectionTimeout, RequestVoteRPC, VoteGranted, BecomeLeader, AppendEntriesRPC, LogAppended, CommitAdvanced, HeartbeatSent, PartitionInjected, NodeRecovered. Each event carries (timestamp, sourceNode, targetNode, term, logIndex, payload) so downstream visualizers can replay state at any cursor position without recomputing. Build a small in-memory state machine that advances one event at a time and snapshots node state (currentTerm, votedFor, log[], commitIndex, role) per tick.

Cover the canonical scenarios explicitly: happy-path election with single candidate, split-vote requiring retry with randomized timeouts, leader failure triggering re-election, network partition isolating the leader (stale-leader scenario), log divergence requiring AppendEntries consistency-check rejection and truncation, and commit-index advancement only after majority replication. Each scenario should be a named seed so the same scenario always produces identical event streams — crucial for reproducible demos and debugging.

Randomized election timeouts (typically 150–300ms range) must be baked into the simulator as a configurable parameter, because the split-vote and convergence behavior depends on this jitter. Expose knobs for cluster size (3, 5, 7 nodes), network latency distribution, packet-loss rate, and partition topology, then ship 5–10 preset scenarios that exercise each knob so users can see how parameter changes affect consensus behavior without building their own simulations.
