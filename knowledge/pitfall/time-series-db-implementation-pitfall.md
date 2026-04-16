---
name: time-series-db-implementation-pitfall
description: Critical TSDB dashboard pitfalls including unbounded memory growth, DPR mishandling, naive storage estimates, and query parser brittleness.
category: pitfall
tags:
  - time
  - auto-loop
---

# time-series-db-implementation-pitfall

The most dangerous pitfall in live TSDB dashboards is unbounded point accumulation. Without an explicit sliding window (`if (points.length > maxPoints) points.shift()`), a 100-200ms push interval generates 18,000-36,000 points per hour. Running `Math.min(...vals)` and `Math.max(...vals)` via spread expansion on the full array will eventually exceed the JavaScript engine's argument-count limit (~65K-125K), crashing the tab with "Maximum call stack size exceeded." Even within safe limits, performing `reduce()`, `Math.min()`, and `Math.max()` over the full window on every animation frame creates O(N) work per frame. For windows above ~500 points, incrementally maintaining running min/max/sum with a sliding-window deque avoids frame drops. A related issue: the live-monitor pattern uses two `setInterval` timers (one for ingestion at 200ms, one for rate calculation at 1000ms) plus a `requestAnimationFrame` draw loop — if the ingestion callback takes longer than its interval under load, points queue up faster than they render, creating a growing lag between real-time and displayed data.

Canvas DPR mishandling is the second most common visual bug. Setting `canvas.width = clientWidth` without multiplying by `devicePixelRatio` renders blurry charts on Retina/HiDPI displays. Conversely, scaling the buffer but omitting `ctx.scale(dpr, dpr)` produces a tiny chart in the upper-left corner. SVG sidesteps this with `viewBox` but introduces its own trap: `getBoundingClientRect()` returns 0x0 if the SVG parent has `display: none` or hasn't completed layout, producing `NaN` coordinates. The query sandbox uses SVG `viewBox="0 0 400 200"` which avoids resize issues but makes tooltip positioning harder since mouse coordinates must be transformed from screen space to viewBox space.

Storage estimation is dangerously naive when using raw `pointsPerDay * days * bytesPerPoint` without accounting for TSDB compression. Real engines (InfluxDB TSM, TimescaleDB columnar, Prometheus gorilla encoding) achieve 1-2 bytes per point through delta-of-delta timestamps and XOR float encoding — an 8x-16x reduction over the 16-24 bytes-per-point raw estimate. Presenting uncompressed figures drives over-provisioning. A retention planner must expose a compression ratio slider (default ~10x) and should warn when raw-tier retention exceeds 7 days at 1-second resolution, as this is the threshold where most teams discover their TSDB write amplification and compaction overhead become the bottleneck, not storage capacity. The query parser regex `/(avg|max|min|sum|count)\((\w+)\)/i` silently falls back to defaults on malformed input — production sandboxes should surface parse errors rather than returning plausible-looking wrong data.
