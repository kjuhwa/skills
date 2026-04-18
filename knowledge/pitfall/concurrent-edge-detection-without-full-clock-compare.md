---
version: 0.1.0-draft
name: concurrent-edge-detection-without-full-clock-compare
description: Rendering "concurrent" edges in a DAG viz requires comparing every pair, not just adjacent events — O(n²) is the correct cost.
category: pitfall
tags:
  - concurrent
  - auto-loop
---

# concurrent-edge-detection-without-full-clock-compare

While building causality DAG visualizations, the tempting optimization is to only check concurrency between events that share a parent or sit within a sliding window. This produces visually plausible but wrong output: two events with no shared ancestry in the window still may be concurrent, and the viewer sees them as causally related (or unrelated) when they aren't. The pitfall is that "concurrent" is a global property of the clock space, not a local graph property.

The correct approach for a viz layer is an explicit O(n²) sweep producing a concurrency matrix, then deriving edges from that matrix. For n ≤ ~2000 events this is fast enough for 60fps interactive rendering; above that, chunk the sweep into requestIdleCallback batches and render progressively rather than shortcutting correctness. If you must prune, prune by wall-clock window *before* building the matrix — never inside the causal compare itself.

```ts
// Wrong: only checks neighbors — misses cross-branch concurrency
for (const [a, b] of adjacentPairs(events)) { ... }

// Right: full pairwise, then render from the matrix
const matrix = new Uint8Array(n * n);
for (let i = 0; i < n; i++)
  for (let j = i + 1; j < n; j++)
    matrix[i * n + j] = causalCompare(events[i].clock, events[j].clock);
```
Document the O(n²) cost in the module header so future optimizers don't "fix" it into incorrectness.
