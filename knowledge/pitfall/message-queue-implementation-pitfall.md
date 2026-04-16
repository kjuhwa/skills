---
name: message-queue-implementation-pitfall
description: Common correctness bugs when implementing queue semantics in browser-based demos
category: pitfall
tags:
  - message
  - auto-loop
---

# message-queue-implementation-pitfall

The most frequent bug is conflating animation time with simulation time: developers advance the queue state inside the rAF callback, which means pausing the animation also pauses the "real" queue and fast-forwarding corrupts ordering. Always maintain a separate simulation tick driven by a scheduler, and let rendering read a snapshot. Related: using `Date.now()` for message timestamps makes replays non-deterministic — use the simulation clock's monotonic counter instead.

Priority queues commonly ship with a sort-on-insert implementation that is O(n log n) per enqueue and visually misleading because the array reshuffles entirely. Use a proper binary heap and animate only the sift-up/sift-down path so the data structure's actual cost is visible. Also watch for stability bugs: two messages with equal priority should dequeue in insertion order, but naive heap comparisons break ties arbitrarily — include a secondary seq field in the comparator.

Pub/sub monitors frequently under-model consumer offset semantics. A single shared "current index" for the topic is wrong — each subscriber needs its own cursor, and a slow subscriber should not block faster ones. Forgetting this produces demos that look like a queue (one message consumed once) rather than a topic (one message delivered to every subscriber). Similarly, unbounded retention with no visual cue for message eviction will mislead users into thinking Kafka-like logs are infinite; show a retention window and animate eviction explicitly.
