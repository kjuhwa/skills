---
name: api-versioning-visualization-pattern
description: Dark-themed, status-color-coded UI pattern for rendering API version lifecycle states across timeline, matrix, and drift views.
category: design
triggers:
  - api versioning visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# api-versioning-visualization-pattern

All three API versioning apps share a unified visual language built around a three-tier status color system: green (#6ee7b7) for active/compatible versions, amber (#f59e0b) for deprecated/partial-compatibility states, and red (#ef4444) for sunset/breaking changes. This palette is applied consistently whether rendering a vertical timeline with dot markers and left-border accents (timeline app), a traffic-distribution line chart with version-keyed legend (drift monitor), or a heatmap grid with cell-level hover tooltips (compatibility matrix). The dark background (#0f1117) with card surfaces (#1a1d27) and subtle borders (#2a2d3a) ensures the status colors carry maximum signal-to-noise ratio.

The interaction patterns are purpose-matched to each view type. The timeline uses a slide-in detail panel triggered by node click, allowing deep inspection of a single version's changelog without losing context. The drift monitor pairs a canvas-drawn multi-line chart (traffic % per version over weekly intervals) with a side stats panel and a consumer table showing per-client migration progress. The compatibility matrix uses a dense grid of colored cells (endpoint x version) with hover-activated tooltips that surface specific breaking-change descriptions. Each view addresses a different stakeholder question — "what changed when?" (timeline), "who is still behind?" (drift), and "which endpoint breaks across which version jump?" (matrix).

The reusable pattern is: define a version-status enum (active/deprecated/sunset or compat/partial/breaking), map it to a fixed color triplet, then apply that mapping uniformly across badges, borders, chart lines, pills, and grid cells. Pair the overview visualization (timeline/chart/matrix) with a detail-on-demand interaction (panel/tooltip/table). This ensures any API versioning dashboard remains scannable at a glance while supporting drill-down for migration planning.
