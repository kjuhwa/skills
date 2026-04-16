---
name: raft-consensus-data-simulation
description: Tick-based discrete event simulation for Raft leader election, log replication, and term progression using randomized timeouts and majority quorum logic.
category: workflow
triggers:
  - raft consensus data simulation
tags:
  - auto-loop
version: 1.0.0
---

# raft-consensus-data-simulation

The leader election simulation uses a tick-driven loop (`requestAnimationFrame`) where each node decrements an election timer initialized to a random value in [150, 300]. When a follower's timer hits zero, it transitions to candidate, increments its term, votes for itself, and broadcasts `requestVote` messages to all alive peers. Messages have delivery delays (15-25 ticks with jitter) modeled as objects in a message queue with a countdown `t` field. On delivery, a node grants its vote if it hasn't voted yet in the current term and the candidate's term is >= its own. The candidate calls `receiveVote()` on each grant, checking `votes > aliveCount / 2` for majority — if met, it becomes leader and resets all other alive nodes to follower state. Leaders send heartbeat messages every 50 ticks to suppress elections. Dead nodes are excluded from vote counts and message routing, enabling partition simulation.

The log replication simulation separates from the election layer. The leader maintains a sequential log; `appendEntry()` pushes an entry `{val, term}` to the leader's log, then schedules staggered replication to each follower using `setTimeout(200 + i*300 + random()*200)`. A `replicated` counter starts at 1 (leader); each successful follower replication increments it. When `replicated === Math.ceil(N/2) + 1`, the `commitIndex` advances to the leader's log length, and all entries up to that index render as committed. This models Raft's "commit on majority replication" rule without needing actual RPC — the timing stagger is enough to show the quorum-forming process. Pre-seeding 3 entries on load (spaced 400ms apart) provides an immediate demo without user interaction.

Term management is consistent across all three simulations: terms increment only when a node starts an election (candidate transition), heartbeats propagate the leader's term to followers via `Math.max(follower.term, leader.term)`, and vote requests carry the candidate's term for comparison. The state machine layer enforces that term increments are coupled to candidate transitions exclusively, and stepping down to follower occurs when a higher term is discovered — either via heartbeat or vote request from a node with a newer term.
