---
version: 0.1.0-draft
name: replication-factor-distinct-physical-walk
description: Walking the ring for N replicas must skip virtual nodes belonging to already-selected physical nodes, not just take the next N vnodes.
category: pitfall
tags:
  - consistent
  - auto-loop
---

# replication-factor-distinct-physical-walk

When implementing replication factor RF=3 on a virtual-node hash ring, the wrong algorithm is "take the next 3 vnodes clockwise from the key's hash." Because each physical node has many virtual nodes scattered on the ring, the next 3 vnodes can easily all belong to the same physical shard — defeating replication entirely. The correct algorithm walks clockwise and collects vnodes only when their physical node hasn't been seen yet.

```js
function replicas(ring, key, rf) {
  const seen = new Set();
  const result = [];
  let idx = bisectLeft(ring, fnv1a(key));
  for (let i = 0; i < ring.length && result.length < rf; i++) {
    const vnode = ring[(idx + i) % ring.length];
    if (!seen.has(vnode.nodeId)) {
      seen.add(vnode.nodeId);
      result.push(vnode.nodeId);
    }
  }
  return result;
}
```

A secondary gotcha: if the total number of physical nodes is less than RF, this loop runs forever-ish (well, ring.length times) and returns fewer replicas than requested. Guard at call-site with `rf = Math.min(rf, physicalNodeCount)` and surface the clamp in the UI, or the user sees RF=5 requested but only 3 highlighted replicas with no explanation.
