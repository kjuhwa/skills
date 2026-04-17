---
name: vector-clock-concurrency-matrix
description: Render N×N pairwise happens-before/concurrent relation grid from a set of vector-clock-stamped events for instant causal inspection.
category: frontend
triggers:
  - vector clock concurrency matrix
tags:
  - auto-loop
version: 1.0.0
---

# vector-clock-concurrency-matrix

Visualizing vector clocks as a timeline is noisy; the pedagogically and diagnostically useful view is the pairwise relation matrix. For each event pair `(a,b)` compute `cmp(va, vb)` → one of `before | after | concurrent | equal`, then render an N×N cell grid colored by relation. Concurrent pairs (the Byzantine/conflict-interesting ones) pop out as a distinct color class, and the matrix is symmetric across the diagonal with swapped before/after — a visual parity check that your comparator is correct.

```js
function cmp(a, b) {
  let lt=false, gt=false;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x=a[k]||0, y=b[k]||0;
    if (x<y) lt=true; if (x>y) gt=true;
  }
  return lt&&gt ? 'concurrent' : lt ? 'before' : gt ? 'after' : 'equal';
}
```

The matrix scales to ~200 events before cells become sub-pixel; past that, bucket by node or time window. Pair the grid with a click handler that highlights the two events in the timeline — this turns an abstract partial-order concept into a direct-manipulation inspector. Useful anywhere you have partially-ordered events: CRDT edits, distributed logs, git DAGs.
