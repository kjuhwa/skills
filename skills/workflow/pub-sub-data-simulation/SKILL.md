---
name: pub-sub-data-simulation
description: Timer-driven synthetic message generation with rate tracking, fan-out delivery, and bounded log accumulation for pub/sub demos.
category: workflow
triggers:
  - pub sub data simulation
tags:
  - auto-loop
version: 1.0.0
---

# pub-sub-data-simulation

All three pub/sub apps simulate realistic traffic without a real broker by using `setInterval` at domain-appropriate cadences — 2.2s for the galaxy (slow enough to watch particles travel), 1.0s for the heartbeat monitor (mimics per-second rate sampling), and 1.8s for the sandbox (fast enough to feel live, slow enough to read). Each tick selects a random topic and generates a payload, then fans out delivery to all registered subscribers. The heartbeat app adds a 60% activity probability gate (`Math.random() < 0.6`) so channels go idle periodically, which is critical for making rate meters and peak tracking feel authentic rather than perpetually maxed out.

Rate and volume metrics are accumulated in-place on channel objects: `rate` (current tick), `msgs` (running total), and `peak` (high-water mark updated via `if (r > ch.peak) ch.peak = r`). This three-field pattern is the minimum needed for a useful pub/sub health card — current throughput, historical volume, and burst ceiling. The sandbox takes a different angle by maintaining per-subscriber inboxes capped at 10 entries (`if (inbox.length > 10) inbox.pop()`), modeling the consumer-side backlog view rather than the broker-side rate view.

All apps enforce bounded DOM growth: the heartbeat log caps at 50 entries, the sandbox event stream at 80, both using `lastChild.remove()` or `pop()` after prepending new items. This is non-negotiable for pub/sub simulations — without eviction, a high-throughput demo will leak DOM nodes and degrade within minutes. The pattern is: prepend new events to the top (most recent first), count children, and trim from the tail on every write.
