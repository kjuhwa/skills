---
name: chaos-engineering-visualization-pattern
description: Reusable visual encoding for chaos experiment state across service dependency graphs, resilience matrices, and operational dashboards.
category: design
triggers:
  - chaos engineering visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# chaos-engineering-visualization-pattern

Chaos engineering UIs share a three-state color vocabulary — green/healthy (#6ee7b7), red/failed (#f87171), amber/degraded (#fbbf24) — that must remain consistent across every view: topology graphs, heatmap matrices, and timeline dashboards. The blast-radius simulator uses a canvas-based dependency graph where nodes represent microservices and edges represent call relationships; clicking a node and injecting failure triggers BFS propagation with probabilistic state assignment (60% failed, 40% degraded) at each hop, animated with staggered setTimeout frames. The resilience matrix uses a service×failure-type grid where each cell is colored by a normalized resilience score (>0.7 green, >0.4 amber, else red) with an "untested" dark state for gaps. Both approaches encode severity as fill opacity — selected/active nodes get higher alpha while background nodes fade — ensuring the viewer's eye is drawn to the blast zone.

The gameday board introduces a complementary time-axis view: an SVG error-rate sparkline with a vertical dashed annotation line at the injection point, letting operators correlate experiment start with metric inflection. All three apps share a dark-background (#0d1117) design language with light text (#c9d1d9), which reduces eye strain during extended incident sessions and makes the red/amber/green palette pop without competing hue. The key reusable pattern is layering these three view types — topology graph for spatial blast radius, matrix heatmap for coverage gaps, and time-series sparkline for temporal correlation — into a unified chaos dashboard where each panel answers a different question: "what broke?", "what haven't we tested?", and "when did it start?".

When implementing this pattern, define the color scale and state enum once in a shared constants module, then pass it to each visualization renderer. The topology graph should accept an adjacency list and a node-state map; the matrix should accept a service list, failure-type list, and a score lookup; the sparkline should accept a time-series array with annotation markers. This separation lets teams swap rendering backends (Canvas, SVG, or a charting library) without changing the data model or the color semantics.
