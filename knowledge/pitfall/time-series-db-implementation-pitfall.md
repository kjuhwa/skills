---
name: time-series-db-implementation-pitfall
description: Common TSDB visualization and simulation pitfalls including unbounded memory growth, full-array aggregation on every frame, missing DPR handling, and naive storage estimation.
category: pitfall
tags:
  - time
  - auto-loop
---

# time-series-db-implementation-pitfall

The most dangerous pitfall in live TSDB dashboards is unbounded point accumulation. Without an explicit sliding window (`if (points.length > maxPoints) points.shift()`), a 100ms push interval generates 36,000 points per hour, causing `Math.min(...vals)` and `Math.max(...vals)` to spread-expand arrays on the stack and eventually hit the JavaScript argument-count limit (~65K-125K depending on engine), crashing the tab with a "Maximum call stack size exceeded" error. Even within safe limits, running `reduce()`, `Math.min()`, and `Math.max()` over the full visible window on every render frame (10 fps for a 100ms interval) creates O(N) work per frame. For windows above ~500 points, incrementally maintaining running min/max/sum in O(1) with a sliding-window deque avoids frame drops.

Canvas DPR mishandling is the second most common issue. If `canvas.width` is set to `clientWidth` without multiplying by `devicePixelRatio`, the chart renders blurry on Retina/HiDPI displays. Conversely, scaling the buffer but forgetting `ctx.scale(dpr, dpr)` produces a tiny chart in the upper-left corner. Both the buffer resize and the context scale must happen at the top of every draw call, since CSS layout changes can alter `clientWidth` between frames. SVG avoids this entirely by using a `viewBox` but introduces its own pitfall: `getBoundingClientRect()` returns 0×0 if the parent container has `display: none` or hasn't completed layout yet, producing `NaN` coordinates and an invisible chart.

Storage estimation using a flat 16 bytes per point ignores real-world TSDB compression. Engines like InfluxDB (TSM), TimescaleDB (columnar compression), and Prometheus (gorilla encoding) achieve 1-2 bytes per point through delta-of-delta timestamps and XOR float encoding. Presenting raw `rate * 86400 * days * 16` figures to users without a compression-ratio caveat (typically 8x-16x) leads to grossly inflated storage projections that can drive over-provisioning decisions. A responsible retention simulator should expose a configurable compression ratio slider (default ~10x) alongside the raw calculation.
