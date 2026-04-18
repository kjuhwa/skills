---
version: 0.1.0-draft
name: quorum-visualization-phantom-partition-tick
description: Simulated network partitions must gate heartbeat delivery at tick-boundary, not message-enqueue time
category: pitfall
tags:
  - lease
  - auto-loop
---

# quorum-visualization-phantom-partition-tick

When visualizing split-brain scenarios, a common bug is partitioning the topology at the moment a user clicks "partition" but letting in-flight heartbeat messages already in the queue deliver to the other side. This creates a visually confusing state where nodes on opposite sides of the partition briefly still see each other, making the split-brain demonstration unconvincing and hiding the real quorum-loss moment.

The fix is to evaluate partition membership at delivery tick, not at send tick. Each message carries (src, dst, sendTick); on delivery the scheduler checks `isReachable(src, dst, currentTick)` against the partition table's state *now*. Messages in-flight when a partition forms get dropped, matching real network behavior where a severed link drops packets mid-transit.

```js
function deliver(msg, tick) {
  if (!partitionTable.reachable(msg.src, msg.dst, tick)) return; // drop
  nodes[msg.dst].receive(msg);
}
```

Apply this any time a simulation layers user-controlled topology mutations over a message queue — auth token revocation, circuit-breaker trips, rate-limit activation all have the same shape.
