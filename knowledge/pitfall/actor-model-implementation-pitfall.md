---
name: actor-model-implementation-pitfall
description: Common correctness and scalability traps when building actor-model simulations — mailbox race conditions, supervision strategy mislabeling, and DOM rebuild bottlenecks.
category: pitfall
tags:
  - actor
  - auto-loop
---

# actor-model-implementation-pitfall

The most dangerous pitfall is the **mailbox counter race condition**. When a message arrives, the mailbox count increments and a `setTimeout` schedules a decrement 800ms later. If multiple messages arrive within that window, multiple independent timers fire and each decrements by 1, but they're decrementing a shared mutable counter without coordination. With burst traffic (e.g., a broadcast sending N-1 messages simultaneously), the counter can momentarily show correct values but decay incorrectly — sometimes going negative if `Math.max(0, ...)` guards are missing on some paths. The fix is to model the mailbox as an actual queue (array of message objects with timestamps) and derive the count from `queue.length`, or use a single drain timer that processes the entire queue rather than per-message timers.

The second critical pitfall is **supervision strategy mislabeling**. In Erlang/OTP and Akka, "one-for-one" means only the failed child restarts while siblings continue. But naive implementations kill *all* children when *any* child crashes (`node.children.forEach(c => { c.alive = false })`) and restart them together — this is actually "one-for-all" behavior wearing a "one-for-one" label. This teaches users incorrect mental models. Worse, restart counters increment for children that didn't fail, inflating metrics and making it impossible to identify which actors are actually unstable. The fix requires tracking which specific child crashed and only restarting that subtree, with separate restart counters per actor that only increment on that actor's own failures.

The third pitfall is the **full DOM/SVG rebuild bottleneck**. All three apps use `container.innerHTML = ''` followed by complete reconstruction on every state change. At small scale (5–20 actors) this is imperceptible, but it creates a hard wall at ~100 actors where frame drops become visible. More subtly, full rebuilds destroy transient DOM state — focus, hover, CSS transition progress, scroll position — causing visual glitches users can't diagnose. The fix is differential rendering: maintain a map of actor-id to DOM element, update only changed properties in-place, and only add/remove elements for spawned/destroyed actors. For Canvas-based renderers, the equivalent is maintaining a spatial index and only redrawing dirty regions rather than clearing the entire canvas each frame.
