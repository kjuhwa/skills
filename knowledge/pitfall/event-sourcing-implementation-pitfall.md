---
name: event-sourcing-implementation-pitfall
description: Common failure modes when implementing event sourcing in browser-based apps — unbounded streams, broken causality, and snapshot neglect.
category: pitfall
tags:
  - event
  - auto-loop
---

# event-sourcing-implementation-pitfall

The most frequent pitfall in browser-side event sourcing is unbounded event array growth. The timeline and bank apps both hit this during development: once the simulated stream exceeds ~10,000 events, `Array.prototype.reduce` over the full log on every render frame causes visible jank (>16ms per fold). The fix is compaction via snapshots — periodically materializing the current projection into a snapshot event and replaying only from the latest snapshot forward. Failing to implement this from the start leads to a costly retrofit, because snapshot logic touches both the event store (insert), the replay function (seek), and the UI (progress bar must account for snapshot jumps). Design the `replayTo` reducer to accept an optional `startFrom` snapshot parameter on day one, even if you don't generate snapshots yet.

A subtler bug surfaces in the replay app's conflict-resolution feature: events that arrive out of causal order. In a real distributed system this manifests as network reordering; in the simulation it happens when two forked streams are naively interleaved by timestamp. If `TransferInitiated` on Account A references a balance computed before a `MoneyWithdrawn` that has a lower timestamp but higher sequence number, the projection produces a negative balance — an impossible state. The defensive pattern is to order events by `(aggregateId, version)` pairs within each aggregate and by global sequence number across aggregates, never by wall-clock time alone. The bank app learned this the hard way when its sparkline dipped below zero during conflict replays.

Finally, all three apps initially serialized the full event payload into `localStorage` on every append for persistence across reloads. This works for demos but fails silently when the 5–10 MB `localStorage` quota is exceeded — the write is simply dropped with no error in some browsers. The knowledge here is: if you need browser-side event persistence beyond a demo, use IndexedDB with an explicit storage-pressure check (`navigator.storage.estimate()`), and degrade gracefully by truncating the oldest events while preserving the latest snapshot. Never treat `localStorage` as a durable event store.
