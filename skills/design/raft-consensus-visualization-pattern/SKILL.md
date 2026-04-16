---
name: raft-consensus-visualization-pattern
description: Multi-panel visualization pattern for rendering Raft cluster state with node roles, term numbers, and log entries
category: design
triggers:
  - raft consensus visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# raft-consensus-visualization-pattern

Raft consensus visualizations should use a cluster-topology layout where each node is rendered as a circular badge showing its current role (Follower/Candidate/Leader) via color coding — typically gray for followers, yellow for candidates, and green for leaders. Arrange nodes in a radial or grid pattern so that RPC arrows (RequestVote, AppendEntries) can be drawn between them without crossing. Each node badge must surface three critical state fields simultaneously: currentTerm, votedFor, and commitIndex, because these are the fields operators inspect when diagnosing split votes or stale leaders.

Pair the topology view with a synchronized log-replication panel that renders each node's log as a horizontal strip of indexed entries, color-coded by term. Committed entries should be visually distinct (solid fill) from uncommitted entries (striped or outlined), and the leader's matchIndex/nextIndex pointers should be drawn as markers above each follower's log strip. Use an election-timeout countdown ring around each follower node to make timer expiry visible — this is the single most important signal for understanding why elections trigger.

For the quiz variant, overlay interactive hotspots on node badges and log entries so learners can click to inspect state at each simulation step. Always include a term-history timeline at the bottom that advances monotonically — regressing term numbers are the clearest signal of a visualization bug and should be impossible by construction.
