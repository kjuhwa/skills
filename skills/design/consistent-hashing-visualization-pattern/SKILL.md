---
name: consistent-hashing-visualization-pattern
description: Renders a consistent hash ring as a circular layout with node-to-key ownership lines and animated migration highlights.
category: design
triggers:
  - consistent hashing visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# consistent-hashing-visualization-pattern

The core visualization maps hash values to angles on a circle using the formula `angle = (hashValue / MAX_HASH) * 2π - π/2`, then projects to Cartesian coordinates via `[cx + R*cos(a), cy + R*sin(a)]`. Nodes are drawn as large colored circles (r=10-12) on the ring perimeter, while keys are smaller dots (r=4-6) connected to their owning node by semi-transparent lines (`nodeColor + '33'` or `'44'` alpha suffix). Ownership is resolved by sorting all nodes by hash position and finding the first node whose hash is >= the key's hash, wrapping to the first node if none qualifies — the canonical clockwise-walk algorithm. A shared color palette (`['#6ee7b7','#f472b6','#60a5fa','#fbbf24','#a78bfa','#fb923c','#34d399','#f87171']`) assigned round-robin to nodes ensures visual differentiation without coordination.

Migration feedback is layered on top: before mutating the node list, snapshot each key's current owner ID, then after the mutation re-resolve ownership and collect keys whose owner changed into a `moved` Set. Moved keys render with a larger radius and full opacity (`r=6, opacity=1`) versus normal keys (`r=4, opacity=0.7`), plus an SVG `<animate>` that shrinks from r=8 to rest size over 0.4s, creating a pulse effect. A legend panel tallies keys-per-node (`assignments.filter(a => a.owner.id === n.id).length`) and a status bar reports `"Keys migrated: ${moved.size} / ${total}"`. This before/after diffing pattern works identically for both add-node and remove-node operations.

The pattern supports two rendering backends interchangeably: Canvas 2D (ring app) and inline SVG string concatenation (migration app). Canvas suits real-time interaction with frequent redraws; SVG suits declarative animation attributes and DOM-based hit-testing. Both share the same `angleToXY` projection, the same clockwise ownership walk, and the same color scheme — only the draw primitives differ (`ctx.arc/fill` vs `<circle>/<line>` elements). Dark backgrounds (#0f1117) with muted tick labels (#444/#999) and bright node fills keep the ring readable at 8+ nodes.
