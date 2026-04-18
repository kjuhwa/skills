---

name: replica-timeline-swimlane-with-causal-arrows
description: Render multi-replica event timelines as horizontal swimlanes with causal arrows drawn in a separate SVG layer above the event grid.
category: frontend
triggers:
  - replica timeline swimlane with causal arrows
tags: [frontend, replica, timeline, swimlane, causal, arrows]
version: 1.0.0
---

# replica-timeline-swimlane-with-causal-arrows

A recurring visualization need for distributed-systems demos is showing N replicas as horizontal lanes, events as dots on each lane positioned by wall-clock X, and causal-dependency arrows connecting dots across lanes. The reusable pattern is a two-layer render: an HTML/Canvas grid for the lanes and event dots (cheap, CSS-positioned, handles hover/click), and an overlaid absolutely-positioned SVG for the arrows (handles curves, arrowheads, z-ordering above dots). Mixing arrows into the same layer as dots forces you to re-solve z-index and hit-testing for every interaction.

The arrow layer recomputes only when the event set or viewport changes, not on hover — memoize on `(events.length, zoomLevel, scrollX)`. Arrows between non-adjacent lanes need a control point biased toward the source lane to prevent visual tangling; use `C sx,sy sx,(sy+ty)/2 tx,ty` cubic Béziers rather than straight lines. For >500 arrows, cull any whose bounding box is outside the viewport before path generation.

```tsx
<div className="timeline-grid">
  {replicas.map(r => <Lane key={r.id} events={r.events} />)}
  <svg className="arrow-layer" style={{position:'absolute', inset:0, pointerEvents:'none'}}>
    {visibleArrows.map(a => <CausalArrow key={a.id} from={a.src} to={a.dst} />)}
  </svg>
</div>
```
The `pointerEvents: none` on the SVG is load-bearing — without it, the arrow layer eats clicks meant for event dots.
