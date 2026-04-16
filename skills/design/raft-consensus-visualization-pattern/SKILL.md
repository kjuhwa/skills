---
name: raft-consensus-visualization-pattern
description: Three complementary visual encodings for Raft consensus: circular-node cluster topology, horizontal log-bar replication view, and SVG state-transition diagram.
category: design
triggers:
  - raft consensus visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# raft-consensus-visualization-pattern

The cluster topology view arranges N nodes (typically 5) in a circle using trigonometric placement (`cx + cos(i/N * 2π) * radius`). Each node is color-coded by role — blue (#3b82f6) for followers, yellow (#fbbf24) for candidates, teal (#6ee7b7) for leaders, gray (#4b5563) for dead/offline. The leader gets an outer ring or glow to distinguish it at a glance. In-flight messages (heartbeats, vote requests) are rendered as small animated dots traveling along the line between sender and receiver, with progress calculated as `1 - remainingTicks / totalTicks`. This makes network latency and message delivery visible. A tick counter anchored to the bottom-left gives temporal context. Click-to-kill/revive on nodes lets users trigger partition scenarios and observe re-election cascading.

The log replication view uses a horizontal bar layout: each node gets a row with its role label (star prefix for leader), and log entries render as inline blocks colored teal when committed or yellow when uncommitted. Commitment visualization flips in real-time as majority replication is achieved — the threshold (`Math.ceil(N/2)`) is shown in a status bar alongside log length and commit index. Staggered `setTimeout` delays (200ms + i*300ms + jitter) simulate network latency so users see entries ripple across followers one by one, making the majority-commit moment visually dramatic.

The state-transition diagram uses SVG with three circles (Follower, Candidate, Leader) connected by five curved paths defined as quadratic/cubic Bézier curves. Arrows from the current state highlight in teal with an active arrowhead marker, while invalid transitions stay gray. Clicking a target state validates against a transition table (`TRANSITIONS.find(t => t.from === current && t.to === target)`) before advancing. A history panel prepends each transition with term number, capping at 20 entries. The term counter increments only on candidate transitions, matching Raft semantics. This interactive approach teaches the state machine without requiring simulation of the full protocol.
