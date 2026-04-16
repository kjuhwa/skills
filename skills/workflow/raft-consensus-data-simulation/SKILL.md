---
name: raft-consensus-data-simulation
description: Deterministic tick-based simulator for generating Raft cluster traces with controllable network partitions
category: workflow
triggers:
  - raft consensus data simulation
tags:
  - auto-loop
version: 1.0.0
---

# raft-consensus-data-simulation

Drive Raft simulations with a deterministic tick loop rather than wall-clock timers. Each tick advances every node's election timeout and heartbeat timers by a fixed delta, processes one message from each node's inbox, and emits a state snapshot. Seed the PRNG used for randomized election timeouts (150-300ms range by convention) so the same seed always produces the same leader-election sequence — this is essential for reproducing bugs and for quiz scenarios that must have a known correct answer.

Model the network as a message bus with per-edge delivery flags: `partitioned`, `delayed`, and `dropped`. A partition scenario simply toggles the edge flags between two node subsets, letting you script the classic Raft test cases (minority partition loses leadership, majority partition elects new leader, partition heal causes log reconciliation). Record every RPC as `{tick, from, to, type, term, prevLogIndex, entries, success}` so the trace can be replayed forward and backward in the UI scrubber.

Expose three simulation knobs to the frontend: tick speed (playback rate), election timeout jitter range, and network reliability percentage. Pre-generate a handful of canonical traces (happy path, split vote, leader failover, log divergence, stale leader rejoin) as fixtures so the UI renders instantly without running the simulator on first load.
