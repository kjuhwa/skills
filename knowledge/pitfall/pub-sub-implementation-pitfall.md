---
name: pub-sub-implementation-pitfall
description: Common failure modes in client-side pub/sub implementations — unbounded state, lost subscriptions, and fan-out blindness.
category: pitfall
tags:
  - pub
  - auto-loop
---

# pub-sub-implementation-pitfall

The most insidious pitfall in client-side pub/sub is unbounded accumulation. The galaxy app's particle array grows with every publish (`particles.push(...)`) and only shrinks when particles fade out — if the publish rate exceeds the fade rate, the array grows without bound, causing frame drops. The sandbox's `bus` object appends callbacks on every `on()` call but never provides an `off()` or unsubscribe mechanism, so dynamically adding and removing subscribers leaks closures permanently. In production-facing demos, every `subscribe` must return an `unsubscribe` handle, and every accumulating collection (particles, log entries, inbox items) needs a hard ceiling enforced on write, not just on render.

Fan-out cost is invisible until it isn't. The galaxy publishes one message but spawns N particles (one per subscriber per topic). The sandbox routes one `emit()` through every callback in `bus[topic]`. Neither app tracks or displays fan-out ratio, so a topic with 8 subscribers silently does 8x the work of a topic with 1. When building pub/sub UIs, always surface the subscriber count next to throughput metrics (as the heartbeat app does with its `subs` field) so operators can distinguish "high publish rate" from "high fan-out on a single publish." Without this, a single slow subscriber on a high-fan-out topic can stall the entire rendering loop.

A subtler issue is topic-subscriber binding timing. The sandbox wires up `on(topic, callback)` at subscriber creation time, but if a new topic is added later, existing subscribers who should logically care about it receive nothing — there's no wildcard or pattern-matching subscription. The heartbeat app sidesteps this by hardcoding channels, but any dynamic pub/sub UI must decide upfront whether subscriptions are exact-match or pattern-based, and whether late-bound topics retroactively notify existing subscribers. Failing to design this contract leads to "silent message loss" bugs that are extremely difficult to reproduce.
