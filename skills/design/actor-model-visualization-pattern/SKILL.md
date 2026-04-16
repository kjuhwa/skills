---
name: actor-model-visualization-pattern
description: Canvas/SVG rendering of actors-as-nodes with mailboxes, in-flight messages, and supervision edges
category: design
triggers:
  - actor model visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# actor-model-visualization-pattern

Each actor renders as a labeled circle whose radius scales with mailbox depth (e.g., `22 + min(mailbox.length * 2, 18)`), with fill color flipping between idle and busy states (`#6ee7b7` for busy/alive). Messages in transit are small dots interpolated along a straight line `from → to` using a per-message `t` parameter incremented each frame; on `t >= 1` the message is pushed into `to.mailbox` and spliced from the in-flight array. Supervision trees use SVG with recursive `layout(node, x, y, w)` that divides horizontal width by `children.length` and steps down ~110px per depth, drawing cubic Bezier edges with midpoint control points `C x,(y+cy)/2 cx,(y+cy)/2 cx,cy-18`.

Status gets encoded via CSS classes (`alive`, `crashed`, `restarting`) toggled on the SVG `<g>` group, plus a secondary restart-count label `↺${n.restarts}` rendered beneath the node. For throughput graphs, sample `total received - lastCount` on a 1s `setInterval` into a rolling 60-point history array and plot a polyline scaled to `max(10, ...history)`. Keep background trails by filling the canvas with low-alpha black (`rgba(15,17,23,0.2)`) instead of clearing, which produces motion blur for moving actors.
