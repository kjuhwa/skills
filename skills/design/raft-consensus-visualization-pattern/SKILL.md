---
name: raft-consensus-visualization-pattern
description: Interactive node-graph visualization of Raft cluster state transitions using canvas with term-aware color coding and animated RPC message arcs.
category: design
triggers:
  - raft consensus visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# raft-consensus-visualization-pattern

Raft cluster visualizations work best as a ring or force-directed layout of 5 nodes on an HTML5 canvas, where each node's visual chrome encodes its current role: a pulsing green border for the leader, amber for candidates mid-election, and muted gray for followers. The critical design insight is that every node must display its current term number prominently inside the circle, because term comparison is the mechanism that resolves split-brain scenarios — users need to see at a glance which node believes it is in which term. State transitions (follower→candidate→leader) should animate with a brief 200ms morph rather than snapping, so the viewer can track causality.

Message passing — RequestVote RPCs and AppendEntries heartbeats — should render as animated arcs between nodes with distinct dash patterns: solid arcs for AppendEntries (data flow), dashed arcs for RequestVote (election protocol). Color the arc by outcome: green for granted votes, red for rejected (stale-term) votes. This dual encoding (dash pattern + color) lets the viewer distinguish election traffic from replication traffic during the chaotic overlap period when a new leader is established but the old leader hasn't stepped down yet. Each arc should carry a small label showing `{term, lastLogIndex}` so the viewer can reason about why a vote was granted or denied.

A timeline scrubber beneath the cluster view is essential. Raft's correctness depends on event ordering, and real-time animation moves too fast for users to follow split-vote scenarios. The scrubber should snap to discrete "ticks" representing Raft logical time steps (not wall-clock time) and allow forward/backward stepping. At each tick, highlight which node is acting and what RPC is in flight. Pairing the spatial cluster view with the temporal scrubber creates the two-axis mental model (who + when) that makes Raft's leader election protocol actually comprehensible.
