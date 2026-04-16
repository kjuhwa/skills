---
name: actor-model-visualization-pattern
description: Visual conventions for rendering actors, mailboxes, and message flows in browser-based actor-model demos
category: design
triggers:
  - actor model visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# actor-model-visualization-pattern

When visualizing an actor system, represent each actor as a bounded node (circle or rounded rectangle) with three persistent visual slots: an identity badge (PID/name), a mailbox queue rendered as stacked envelopes or a horizontal strip with a visible depth counter, and a state indicator (color-coded: green=idle, amber=processing, red=crashed, gray=stopped). Messages in flight should be animated as discrete tokens traveling along directed edges from sender to receiver's mailbox tail, with easing that reflects latency rather than instant teleportation — this makes asynchrony legible. Supervision hierarchies (as in supervision-tree-viz) must be drawn as a tree with strategy labels on parent edges (one-for-one, one-for-all, rest-for-one) and restart intensity counters visible near each supervisor.

For orchestration views like message-flow-orchestra, use a timeline or swim-lane layout where each actor owns a lane and messages are arrows crossing lanes at their send/receive timestamps. Critically, show the gap between send and receive — the asynchronous delivery window is the whole point of the model and collapsing it loses pedagogical value. Highlight mailbox backpressure with a visual threshold line and color the mailbox fill when it crosses warning/critical bands.

Always expose a tick/step control alongside play/pause so learners can single-step message delivery. Pair the canvas with a side panel that lists the currently-processing message and the actor's behavior/receive clause, so viewers can connect visual state to the code-level pattern match happening inside each actor.
