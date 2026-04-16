---
name: distributed-tracing-implementation-pitfall
description: Common failure modes when building distributed tracing UIs including clock skew, span ID collisions, runaway recursion, and tooltip/canvas coordinate misalignment.
category: pitfall
tags:
  - distributed
  - auto-loop
---

# distributed-tracing-implementation-pitfall

The waterfall viewer's recursive span generation has no guard against child spans exceeding the parent's time boundary — `offset += 5 + random * 20` can push child start times beyond `trace.total`, producing spans with negative effective duration after the `Math.min(dur, total-start)` clamp. In production trace data, clock skew between services causes the same problem: a child span appears to start before its parent or extend beyond the parent's end, breaking waterfall layout assumptions. The fix requires clamping each child's `[start, start+duration]` to the parent's interval and visually flagging out-of-bounds spans rather than silently clipping them, since silent clipping hides real instrumentation problems.

The topology map's particle animation uses a naive linear interpolation (`p.x += (tx - px) * speed * 3`) that doesn't guarantee arrival at the target — particles asymptotically approach but may never reach the destination node, causing visual "stalling" at high frame rates. The `p.t >= 1` removal check races with the position update, so particles can be removed before visually arriving. In production, this mirrors a real observability pitfall: request flow animations that don't accurately reflect actual latency or completion create false confidence in system health. Additionally, the heatmap's `mousemove` coordinate mapping (`(clientX - rect.left) / rect.width * BUCKETS | 0`) breaks when CSS transforms, scrolling, or device pixel ratios alter the canvas-to-screen mapping — a pervasive issue in canvas-based observability dashboards. Always use `canvas.getBoundingClientRect()` fresh per event and account for `window.devicePixelRatio` in both the canvas resolution (`canvas.width = rect.width * dpr`) and the hit-test math, or tooltip cells will misalign on HiDPI displays and when the page is scrolled.
