---
name: distributed-tracing-implementation-pitfall
description: Common implementation pitfalls when building distributed tracing visualizations, including timing violations, lost hierarchy, and misleading color schemes.
category: pitfall
tags:
  - distributed
  - auto-loop
---

# distributed-tracing-implementation-pitfall

The most dangerous pitfall is **losing span causality during data flattening**. All three analyzed implementations flatten the recursive span tree into a flat array (`[node, ...children]`) immediately after generation, discarding the parent-child relationship. This makes it impossible to answer "what called this span?" or "what are the downstream effects of this span's failure?" without re-inferring hierarchy from timing overlaps—a lossy heuristic that breaks with concurrent spans at the same depth. Always persist `parentSpanId` on every span, and build an index (`Map<spanId, span>`) for O(1) ancestor traversal. Without explicit hierarchy, features like critical-path highlighting, error propagation tracing, and subtree collapsing become either impossible or unreliable.

The second major pitfall is **timing model incoherence**. One implementation derived duration from visual pixel width (`dur = width * 2.5`), making duration a rendering artifact rather than a data property—bidirectional mapping breaks because you cannot reconstruct actual service latency from the visual representation. Another implementation allowed child spans to silently exceed parent bounds, truncating them without warning, which produces traces where a child appears to end after its parent—a causality violation that confuses users trying to diagnose latency. The fix is to treat timing as the source of truth: generate `start` and `duration` in absolute milliseconds first, validate parent-child containment as an invariant (`assert child.start >= parent.start && child.start + child.duration <= parent.start + parent.duration`), and derive all visual positioning from these values during rendering. Never go the other direction (visual → timing).

The third pitfall cluster involves **misleading visual encoding**. Color-by-index makes the same service appear in different colors across traces. Color-by-depth conflates call depth with service identity (all depth-0 spans are colored identically regardless of which service they represent). Both patterns train users to associate meaning with color that doesn't exist, leading to false pattern recognition. Additionally, the topology view generated per-node RPS and per-edge call rates independently, so the sum of outbound edge rates could exceed a node's total RPS—a data inconsistency that undermines trust in the visualization. Metrics must be generated top-down: start with node RPS, then distribute outbound calls proportionally across edges. Finally, resize handling is frequently broken: one app regenerated the entire trace (with new random data) on window resize, another had no resize handler at all. Both approaches corrupt the user's mental model. The correct pattern is to store trace data separately from rendering state, and re-render the same data when the viewport changes.
