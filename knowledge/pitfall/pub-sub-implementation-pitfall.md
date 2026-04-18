---
version: 0.1.0-draft
name: pub-sub-implementation-pitfall
description: Synchronous in-loop dispatch causes slow subscribers to block publishers and starve fast ones
category: pitfall
tags:
  - pub
  - auto-loop
---

# pub-sub-implementation-pitfall

The most common pub-sub bug in these labs is dispatching to all subscribers inside the publisher's call stack with a simple `for (sub of topic.subs) sub.onMessage(msg)`. One slow subscriber (or one that throws) now blocks the publisher and every subscriber behind it in the loop. The fix is per-subscriber queues with independent consumer loops (or microtask/setTimeout dispatch), so publisher latency is O(1) regardless of subscriber count or behavior. Also wrap each subscriber callback in try/catch — an unhandled exception in one subscriber must never prevent delivery to the others.

A related pitfall is unbounded inbox growth: without a queue cap and overflow policy, a slow subscriber leaks memory until the tab crashes — easy to hit in pub-sub-event-bus-lab when you spin up a flaky subscriber and let the sim run for minutes. Always cap inbox size and surface the overflow policy in the UI.

Topic matching is the third trap. Naive string equality breaks wildcard subscriptions (`news.*`, `news.#`), and naive regex conversion mishandles the dot separator — `news.*` accidentally matches `newsXsports`. Build a proper segment-based matcher that splits on `.`, treats `*` as "exactly one segment" and `#` as "zero or more segments", and cache compiled matchers per subscription since topic lookup runs on every publish.
