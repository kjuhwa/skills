---
name: canary-release-visualization-pattern
description: Dark-themed canvas/SVG visualization pattern for real-time canary deployment traffic flow, phase timelines, and metric comparison charts.
category: design
triggers:
  - canary release visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# canary-release-visualization-pattern

Canary release UIs share a consistent visual language built on a dark ops-console palette (`#0f1117` background, `#1a1d27` card surfaces) with two semantic colors: blue (`#3b82f6`) for the stable version and green (`#6ee7b7`) for the canary. This dual-color encoding persists across every visualization—particle lanes in the traffic shifter, dual-line latency charts in the dashboard, and error-rate time series in the rollback simulator—so operators can instantly distinguish canary from stable without reading labels. All three apps use `canvas.getContext('2d')` for streaming metric charts and inline SVG for static structures (deployment timelines, error-budget rings), choosing the right primitive for the update frequency.

The reusable layout is a vertical stack: a header with version/phase badge, an interactive control bar (slider for traffic ratio, buttons for fault-inject/rollback/promote), a primary canvas chart in the center, and a bottom metrics strip showing RPS, error rate, or uptime. Grid cards use `border-radius: 10px` on `#1a1d27` surfaces with uppercase small-caps headers (`0.8rem`, `#94a3b8`). The deployment timeline is an SVG step-progress: circles connected by lines, filled green for completed phases and dark for pending, with the active node rendered as a hollow ring with a green stroke to draw the eye. This timeline-plus-live-chart pairing lets operators correlate "which promotion phase are we in" with "how are metrics behaving right now."

Alerts follow a two-state pattern: error alerts use a translucent red background (`#f8717133`) with red border and text, success/rollback confirmations swap to translucent green (`#6ee7b722`) with green border. The `.hidden` class toggles visibility. Threshold lines on charts are drawn as red dashed lines (`stroke-dasharray: [4,4]`, `#f87171`) so the eye immediately sees when a canary metric breaches the boundary. This red-threshold-on-dark pattern is critical for canary UIs because the operator's primary question is always "has the canary crossed the danger line?"
