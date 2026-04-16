---
name: consistent-hashing-visualization-pattern
description: Render consistent-hash rings as SVG/Canvas circles with node arcs, virtual-node markers, and animated key-to-node traversal paths
category: design
triggers:
  - consistent hashing visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# consistent-hashing-visualization-pattern

For consistent-hashing UIs, model the hash space as a circular 0 to 2^32 ring rendered as an SVG circle. Each physical node becomes N virtual nodes (vnodes), placed at angle = (hash(nodeId + ":" + i) / 2^32) * 2π. Color vnodes by their parent node so users visually see how one node occupies many non-contiguous arcs. Keys are rendered as small dots on the ring's outer radius, and the owning node is found by walking clockwise to the first vnode ≥ key hash (wrap at 2π). Draw that traversal as an animated arc from key position to landing vnode — this is the single most effective teaching animation for consistent hashing.

Composition-wise, split the canvas into three zones: (1) the ring itself center-left, (2) a node legend with key-count bars top-right, (3) an event log / control strip bottom. When a node is added or removed, keep the ring static and animate only the affected arc(s) — highlighting which keys actually move (the ones between the new vnode and its clockwise predecessor) versus which stay put. This directly visualizes the "only K/N keys move" invariant that distinguishes consistent hashing from modulo hashing. Use a toggle to overlay a "naive mod-N" view so learners can see the full-reshuffle failure mode side-by-side.

For interactivity: sliders for vnode count (1–500) and node count (1–20), a "stress test" button that fires 10k synthetic keys and builds a live histogram of load-per-node, and a hover state on any vnode that highlights its arc and enumerates the keys it owns. Keep the hash function swappable (FNV-1a, murmur3, SHA-1 truncated) via a dropdown — learners inevitably ask "does the hash choice matter?" and the visualization should answer it empirically.
