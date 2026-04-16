---
name: canary-release-visualization-pattern
description: Multi-panel canvas/SVG visualization for canary deployment traffic, health metrics, and rollout progression.
category: design
triggers:
  - canary release visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# canary-release-visualization-pattern

Canary release dashboards follow a consistent three-panel visualization pattern: a **traffic-split donut chart** showing the stable-vs-canary percentage, **dual-line time-series graphs** comparing error rates and latency (p99) between stable and canary cohorts, and a **status indicator** that derives health from a sliding-window average (e.g., last 5 error-rate samples). The donut uses arc-based canvas rendering with a thick stroke and centered percentage label, while the line charts overlay two colored series (green for stable, red for canary) on a shared axis with a fixed rolling window (typically 30 data points). This split lets operators see both the macro decision (how much traffic) and the micro signal (is it healthy) at a glance.

For timeline and fleet-level views, SVG horizontal bar lanes map each rollout phase (1% → 5% → 10% → 25% → 50% → 100%) to a progress bar that fills proportionally to elapsed time within that phase. The simulator variant uses a grid of pulsing canvas circles where color encodes version (green=stable, amber=canary) and a proximity-infection mechanic visually demonstrates how canary versions propagate across a fleet. Both approaches share a dark-background palette (#0f1117 / #1a1f2e) with high-contrast accent colors (#6ee7b7 stable, #fbbf24 or #f87171 canary) to ensure instant visual distinction between deployment cohorts.

Across all three apps, interactive controls (sliders, step buttons, auto-roll toggles) are placed above or beside the visualization and directly mutate shared state variables (canaryPct, phaseIdx, node.canary) that the render loop consumes. This immediate-feedback loop—where UI controls drive state and the animation frame or setInterval picks up changes—keeps the visualization responsive without requiring a framework. The pattern is lightweight enough for zero-dependency HTML apps while remaining structurally clear for migration into React/Vue components.
