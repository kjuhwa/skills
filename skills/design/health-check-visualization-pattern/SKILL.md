---
name: health-check-visualization-pattern
description: Multi-perspective health-check dashboards combining radar spread, vital gauges, and temporal timeline views
category: design
triggers:
  - health check visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# health-check-visualization-pattern

Health-check visualization works best when three complementary lenses are offered together rather than forcing one chart to carry every signal. A radar view maps subsystems (CPU, memory, disk, network, dependencies, queue depth) to axes so an operator instantly sees which dimensions are degrading relative to healthy baselines — the polygon's shape is the diagnostic, not any single value. A vitals view reduces each subsystem to a large, color-banded gauge or stat tile (green/amber/red thresholds) optimized for at-a-glance triage on wall displays. A timeline view stacks per-check status bars against wall-clock time so flapping, correlated outages, and recovery windows become obvious.

The reusable pattern is to share one normalized health-sample schema across all three views: `{ checkId, subsystem, status: 'pass'|'warn'|'fail', value, threshold, timestamp, latencyMs }`. Each visualization is a pure render over the same stream, which keeps color semantics, thresholds, and subsystem naming consistent as operators switch lenses. Radar renders the latest sample per subsystem; vitals renders latest + trend arrow from the previous sample; timeline renders a rolling window (default 15 min, zoomable to 24h).

Layout convention: radar top-left for shape-recognition, vitals top-right as the "is-it-on-fire" strip, timeline as a full-width bottom band because time needs horizontal real estate. Always expose a hover/click interaction that cross-highlights the same subsystem across all three panels — this is what makes the multi-view worth more than any single chart.
