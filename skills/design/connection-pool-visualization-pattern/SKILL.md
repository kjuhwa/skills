---
name: connection-pool-visualization-pattern
description: Render fixed-size connection pools as slot grids, orbital bubbles, or meter strips with active/idle color states and real-time throughput charts.
category: design
triggers:
  - connection pool visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# connection-pool-visualization-pattern

All three apps share a core visual idiom: a fixed-capacity pool rendered as discrete visual elements — rectangular grid slots (monitor), orbiting circle bubbles (bubbles), or inline meter strips (tuner). Each element maps 1:1 to a connection object carrying `active`/`busy` boolean state and a `ttl`/`remaining` countdown. The active state uses accent green (`#6ee7b7`) against a dark idle background (`#1a1d27`/`#2a2d37`), creating immediate scan-ability. The bubbles app adds a `pulse` decay multiplier (0.96× per frame) to animate acquisition glow, while the monitor and tuner use CSS transitions or instant repaints. All three overlay a status bar showing `active/total` counts plus queue depth, positioned either as stat cards (monitor), a fixed HUD pill (bubbles), or labeled range-controlled panels (tuner).

A second layer pairs the slot view with a time-series chart tracking throughput or utilization. The monitor draws a single polyline of `acquired` count onto a canvas with a 60-sample rolling window. The tuner splits into two side-by-side canvases — latency and utilization percentage — each with filled-area gradients under the line. The reusable pattern is: push the current metric into a bounded array (`history.push(v); if (history.length > 60) history.shift()`), then iterate with x mapped to index/maxLength and y mapped to value/maxValue. To add back-pressure visibility, draw queue depth as a secondary colored line or as dot indicators beneath the pool grid (as the bubbles app does with orange/red aging dots at `cy + 70`).

The color vocabulary is consistent and domain-specific: green (`#6ee7b7`) = active/acquired connection, orange (`#f0883e`) = released/latency warning, red (`#f85149`) = timeout/exhaustion. This three-color system maps directly to connection-pool operational states. When building a new pool visualization, reuse this palette and the slot-per-connection metaphor, then choose the geometry (grid for dashboards, orbital for presentations, inline meters for tuning panels) based on context.
