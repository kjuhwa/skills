---
name: object-storage-visualization-pattern
description: Reusable visual encoding patterns for rendering object-storage buckets, objects, and operations on a dark-themed canvas/SVG dashboard.
category: design
triggers:
  - object storage visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# object-storage-visualization-pattern

Object-storage visualizations benefit from a three-layer visual hierarchy: **aggregate containers** (buckets or storage tiers), **individual objects** (sized/colored by metadata), and **operational overlays** (latency sparklines, cost tickers, log tails). The bucket-viz app maps each stored object to a circle on a `<canvas>` whose radius scales with `sqrt(size / totalSize)`, using soft collision physics (pairwise overlap push at 0.3x correction factor) so bubbles self-arrange without overlap. Objects are color-coded by MIME type (image=#6ee7b7, video=#f97316, doc=#60a5fa, archive=#a78bfa, data=#fb7185) — a palette that recurs across all three apps. Hover hit-testing uses `Math.hypot` against the rendered radius and draws an inline tooltip bar at canvas bottom rather than a floating DOM element, keeping the rendering loop self-contained.

For time-series operational data (latency, cost accumulation), the latency-monitor app uses an SVG `<polyline>` per S3 operation type (GET/PUT/DELETE/LIST), capped at 60 data points with `shift()`-based sliding window, and pairs it with status cards whose border color flips to red (#fb7185) when latency exceeds a threshold (150ms). The lifecycle-sim replaces the time axis with a discrete day counter, rendering objects as 32px colored tiles that transition between tier columns (Hot→Warm→Cold→Expired) via CSS `transition: all .4s`. All three share the same dark background (#0f1117), card surface (#1a1d27), and accent (#6ee7b7) — a proven object-storage dashboard palette. The key reusable pattern is: pick one visual metaphor per concern (bubbles for capacity, polylines for latency, tile migration for lifecycle), keep each in a single render loop, and unify them through a shared color system tied to object types or operation verbs.

The DOM structure follows a consistent `#app > header > controls > visualization > detail-panel` skeleton. Controls are minimal (1-3 buttons), stats are auto-updated text spans, and detail views (tooltip, log panel, cost ticker) are positioned below the main visualization rather than as modals. This bottom-anchored detail pattern avoids z-index conflicts with canvas/SVG and keeps the user's eye on the primary viz while still surfacing per-object or per-operation detail on demand.
