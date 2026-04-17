---
name: token-range-ownership-requires-wrap-around-arc
description: Token ranges on a hash ring are arcs, not intervals — the last vnode owns the arc that wraps past 2^32 back to the first.
category: pitfall
tags:
  - consistent
  - auto-loop
---

# token-range-ownership-requires-wrap-around-arc

When rendering or reasoning about "which shard owns which token range," the natural instinct is to sort vnodes by hash and assign each vnode the interval `(prev.hash, this.hash]`. This breaks at the boundary: the vnode with the smallest hash has no "previous" vnode in the sorted list. The correct model is that each vnode owns the arc *from the previous vnode going clockwise to itself*, and the smallest-hash vnode owns the arc that wraps from the largest vnode's hash, past 2^32/max, back down to its own hash.

Symptoms of getting this wrong: a visible "dead zone" at the top of the ring where keys appear unowned, or the first vnode's load is suspiciously low, or replication-factor-N lookups return only N-1 distinct shards near the wrap. Fix by explicitly computing ownership as `owner(key) = first vnode where vnode.hash >= key.hash, else ring[0]` — the `else` branch is the wrap, and it must exist.

This also affects replication factor: walking clockwise to collect N distinct physical nodes must wrap the array with modulo, not stop at the end. Many tutorial implementations silently drop the last replica for keys near the wrap boundary.
