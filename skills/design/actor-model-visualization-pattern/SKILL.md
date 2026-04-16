---
name: actor-model-visualization-pattern
description: Render actor system topology and message flow using Canvas/SVG with state-driven color coding and animated transitions.
category: design
triggers:
  - actor model visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# actor-model-visualization-pattern

Actor-model visualizations divide into three rendering tiers depending on what aspect of the system they surface. **Topology views** (supervision trees) use SVG with `circle` + `line` elements and a parent-child adjacency list (`{ id, parent, x, y }`). Each node's fill color is driven by a finite state array (`alive → #6ee7b7`, `crashed → #ef4444`, `restarting → #f59e0b`), and opacity drops to 0.5 for non-alive states. Clicking a node triggers a state cascade—crash propagates downward to children, restart propagates upward from the supervisor—mirroring Erlang/Akka "let it crash" semantics visually. **Message-flow views** use Canvas 2D with `requestAnimationFrame` loops. Each message is an interpolated particle (`m.t += 0.02`) traveling from sender `(x,y)` to receiver `(x,y)`, with a labeled type (ping, task, ack). On arrival (`t >= 1`), the receiver's mailbox badge counter increments and auto-decrements after a delay, giving a pulse-like visual of backpressure. **Mailbox-detail views** use DOM cards rather than canvas, rendering each actor as a card with an ordered queue of `<div class="msg">` elements. The currently-processing message gets a distinct CSS class (`.processing` with orange highlight), and a per-actor `speed` value (500–2000ms via `setTimeout`) controls dequeue rate, making processing heterogeneity visible at a glance.

A consistent dark palette (`#0f1117` background, `#6ee7b7` teal accent, `#f97316` orange for alerts) unifies all three tiers. The critical reusable pattern is **state-to-color mapping as a single function** (`function color(i) { return stateMap[state[i]]; }`) that every render pass consults, keeping the visual encoding decoupled from the simulation logic. Auto-timers (`setInterval` at 800–1200ms) inject background traffic so the visualization is never static, which is essential for demonstrating emergent actor-system behavior like mailbox buildup and supervision cascades without requiring constant user interaction.
