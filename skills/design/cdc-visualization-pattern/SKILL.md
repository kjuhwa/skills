---
name: cdc-visualization-pattern
description: Reusable visual encoding for Change Data Capture event streams across canvas, table-diff, and SVG pipeline views.
category: design
triggers:
  - cdc visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# cdc-visualization-pattern

CDC visualizations share a mandatory three-color operation encoding: INSERT maps to green (#6ee7b7), UPDATE to blue (#60a5fa), DELETE to red (#f87171). This trichotomy must be consistent across every view — particle streams, diff-highlighted table rows, log entries, and pipeline flow dots all use the same palette so users build one mental model. The stream-monitor proves this works at high throughput with canvas particles; the table-diff proves it works at row-level granularity with CSS classes (`.added`, `.changed`, `.removed`); the pipeline-builder extends it to topology edges with animated dots. Any CDC UI that breaks this mapping forces users to re-learn operation semantics per screen.

Layout follows a source-left/sink-right or top-down flow metaphor. The stream-monitor drops particles top-to-bottom (source at sky, consumption at ground). The pipeline-builder places source nodes left, transform center, sink right, with animated dots traveling the edges. The table-diff uses left=before, right=after panels. This spatial consistency means the user always reads CDC flow in one direction. Nodes are typed into exactly three categories — source (databases: PostgreSQL, MySQL, MongoDB), transform (Filter, Map, Flatten, Enrich), and sink (Kafka, S3, Elastic, Redis) — each with its own accent color, and the pipeline is seeded with a demo topology so the canvas is never empty on first load.

Dark-theme styling is non-negotiable for operational dashboards: background #0f1117, panel surfaces #1a1d27, borders #2a2d37, muted text #94a3b8, bright text #e2e8f0. All three apps share this exact palette, header bar pattern (fixed top, flex space-between, 1px bottom border), and monospace font for data cells. Controls (selects, buttons) inherit the surface color and highlight with the green accent on hover. This creates a zero-configuration design system where any new CDC view slots in visually without custom theming work.
