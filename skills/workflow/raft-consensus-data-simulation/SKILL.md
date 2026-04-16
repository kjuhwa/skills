---
name: raft-consensus-data-simulation
description: Discrete-event simulation engine for Raft protocol mechanics with configurable election timeouts, network delays, and deterministic replay for testing edge cases.
category: workflow
triggers:
  - raft consensus data simulation
tags:
  - auto-loop
version: 1.0.0
---

# raft-consensus-data-simulation

Simulating Raft requires a discrete-event priority queue rather than `setInterval`-based timers, because Raft's correctness properties depend on the relative ordering of events, not their wall-clock timing. Each node object maintains its own state (`{role, currentTerm, votedFor, log[], commitIndex, nextIndex[], matchIndex[]}`) and the simulation engine dequeues the next event (election timeout fires, RPC arrives, heartbeat due) by logical timestamp. This approach allows deterministic replay: given the same random seed for election timeout jitter (150–300ms range), the exact same election sequence reproduces, which is critical for demonstrating specific scenarios like split votes or competing candidates.

Network simulation must model three distinct failure modes independently: (1) message delay — RPCs arrive late but intact, useful for showing how election timeouts interact with slow networks; (2) message loss — RPCs vanish entirely, which triggers re-elections and demonstrates Raft's availability properties; (3) network partitions — bidirectional link failure between node subsets, which is the scenario that truly tests Raft's safety guarantee (at most one leader per term). The partition model should use an adjacency matrix of boolean link states so the UI can let users click between node pairs to toggle connectivity, creating asymmetric partition topologies that reveal subtle behaviors like a partitioned leader continuing to accept writes that will never commit.

Mock client requests should inject `{key, value, requestId}` entries into the leader's log at a configurable rate. The simulation must correctly implement the commit rule: an entry is committed only when replicated to a majority AND the entry's term matches the leader's current term (the "term check" from Section 5.4.2 of the Raft paper). Skipping this term check is the single most common simulation bug — it allows entries from previous terms to be committed by counting replicas alone, which violates Raft's safety property and leads to scenarios where committed entries can be overwritten after a leader change.
