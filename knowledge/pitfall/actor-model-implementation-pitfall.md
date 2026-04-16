---
name: actor-model-implementation-pitfall
description: Common mistakes when modeling actors, mailboxes, and supervision in educational simulations
category: pitfall
tags:
  - actor
  - auto-loop
---

# actor-model-implementation-pitfall

The most frequent mistake is treating actor message passing as synchronous function calls — using `actor.receive(msg)` directly instead of enqueueing into a mailbox and letting the scheduler dispatch later. This silently eliminates the asynchrony and ordering guarantees the model is meant to teach: callers appear to block, causality looks linear, and deadlocks or mailbox-overflow scenarios become impossible to reproduce. Always insert the mailbox and the tick boundary between send and receive, even if it feels like indirection for a small demo.

A second trap is conflating actor identity with object reference. When a supervisor restarts a child, the restarted actor must keep the same logical PID but get a fresh state — if the visualization holds a direct object pointer, restarts appear to "do nothing" because the old instance is still referenced. Use a PID→actor registry and look up by PID on every dispatch. Related: forgetting that children started *after* a crashed sibling must also be restarted under rest-for-one strategy is a classic supervision-tree bug that only surfaces with specific spawn orderings.

Finally, unbounded mailboxes in simulations produce misleading steady-state visuals — queues grow forever under any arrival rate ≥ service rate, so the demo looks "fine" until memory explodes. Always enforce a mailbox capacity with an explicit drop or block policy, surface drops as a metric, and show backpressure propagating upstream. Without this, learners walk away thinking actors magically absorb load, which is the opposite of the lesson.
