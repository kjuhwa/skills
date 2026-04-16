---
name: time-series-db-visualization-pattern
description: Render TSDB metrics as real-time area charts with gradient fills, stat cards, and DPR-aware canvas/SVG on a dark monitoring theme.
category: design
triggers:
  - time series db visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# time-series-db-visualization-pattern

Time-series database dashboards share a distinctive visualization stack: a gradient-filled area chart (line on top, translucent fill below tapering to transparent) drawn on either Canvas 2D or inline SVG, paired with a row of stat cards showing Current, Average, Min, and Max aggregates. The color scheme anchors on a dark background (#0f1117) with a muted-green accent (#6ee7b7) for data lines, active states, and value highlights, giving the UI an ops-console feel without external charting libraries. Grid lines at fixed vertical intervals provide visual scale without axis labels cluttering the streaming view.

The coordinate mapping follows a consistent formula: X maps the point index linearly across the drawing width (`i / (N-1) * W`), while Y inverts the normalized value into pixel space with symmetric padding (`pad + (1 - (v - min) / (max - min)) * (H - 2*pad)`). Canvas implementations must account for `devicePixelRatio`—resizing the backing buffer to `clientWidth * dpr` and applying `ctx.scale(dpr, dpr)` each frame—while SVG implementations use a dynamic `viewBox` derived from the parent container's `getBoundingClientRect()`. Both approaches re-render on `window.resize` and on every data push, keeping the chart responsive.

Stat cards sit above or beside the chart as a flex row of small panels, each with a large numeric `.val` and a small `.lbl` caption. They recalculate from the full visible window on every render frame using `Math.min/max(...vals)` and a running average. This pattern works for live dashboards (100ms interval push), query explorers (on-demand render after query), and capacity planners (slider-driven re-simulation), making it the universal TSDB visualization primitive.
