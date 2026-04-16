---
name: finite-state-machine-implementation-pitfall
description: Common FSM implementation mistakes — missing transitions, absent dead states, self-loop rendering bugs, and input validation gaps.
category: pitfall
tags:
  - finite
  - auto-loop
---

# finite-state-machine-implementation-pitfall

The most dangerous pitfall in FSM implementations is incomplete transition coverage. The regex matcher handles this explicitly with a `DEAD` state — any symbol not in the delta table routes to `DEAD`, and `DEAD` transitions to itself on all inputs, making the machine total (defined for every state-symbol pair). The visual simulator, however, silently does nothing when `transitions.find()` returns `undefined`: the state simply doesn't change, which means the machine halts mid-input without signaling an error. In production, this silent failure can mask bugs in the transition table. The fix is to always define a sink/dead/trap state and route all undefined transitions there, then check for it in the accept evaluation. Similarly, the regex matcher coerces unknown characters to `'a'` as a workaround (`const sym = ['a','b','c'].includes(ch) ? ch : 'a'`) — this is a hack that silently corrupts the input rather than rejecting it.

Self-loops create subtle rendering issues across all three apps. The visual simulator draws self-loops as small arcs above the node with a dedicated `drawSelfLoop()` function, but this function doesn't account for nodes near the top of the canvas — the arc can clip outside the viewport. The regex matcher hardcodes the self-loop path geometry specifically for state `S1`, meaning adding another self-loop requires duplicating the SVG path logic. A robust approach is to parameterize self-loop rendering by node position and offset angle, so any state can have a self-loop without special-casing.

Timer-based FSMs like the traffic controller introduce a third class of bug: race conditions between user actions and automated transitions. The emergency button calls `transition('EMERGENCY')` immediately, but the `setInterval(tick, 1000)` keeps running — if the timer fires between the emergency transition and the next render, the machine can skip the emergency state entirely or double-transition. The pattern also hardcodes `duration` in seconds tied to a 1-second interval, creating a tight coupling where changing the tick rate silently breaks all timing. Guard against this by checking state validity at the start of each tick, and decouple "simulation time units" from "wall-clock interval" so the two can vary independently.
