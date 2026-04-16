---
name: dead-letter-queue-visualization-pattern
description: Visual patterns for rendering DLQ state across pulse graphs, topology maps, and retry workflows in vanilla JS dark-theme dashboards.
category: design
triggers:
  - dead letter queue visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# dead-letter-queue-visualization-pattern

All three DLQ apps share a layered visualization strategy that encodes queue health through color semantics and animation intensity. DLQ nodes and messages use a red palette (#f87171) contrasted against green (#6ee7b7) for healthy flow, with yellow/amber (#fbbf24) for intermediary exchange points. Severity is encoded both in color and label — error/warning/info tags on pulse-monitor entries, attempt counts on retry-arena cards, and accumulating counts on topology-map nodes. Pulsing SVG `<animate>` rings expand outward from DLQ nodes proportional to their dead-letter count, giving operators an at-a-glance severity heatmap without reading numbers. Animated particles (SVG circles traveling along edge paths) show directional message flow — green for normal consumer delivery, red for DLQ routing — with randomized speed (0.008–0.02 per frame) to avoid a mechanical look.

The three apps represent three complementary DLQ viewpoints that should be built together: (1) a time-series pulse showing message arrival rate via a Canvas line graph with a 60-point sliding window, (2) a three-column Kanban board (Dead Letters → Retrying → Resolved) for interactive message lifecycle management, and (3) a topology DAG rendered in SVG showing producers, exchanges, queues, DLQ endpoints, and consumers as a node-edge graph. Tooltips on topology nodes enumerate per-queue failure reasons (e.g., "Schema v2 mismatch", "Null orderId") giving drill-down context. Each view uses a monochrome dark background (#0d1117) with translucent fills (hex + `22` alpha) and thin strokes to keep the UI information-dense without visual noise.

The layout pattern is minimal: a single `#app` container, a heading, a stats bar or column header strip, and one primary visualization element (canvas, SVG, or div-based card list). CSS is kept under 80 lines per app. Interaction is limited to hover tooltips (topology) and click-to-retry/purge buttons (arena), avoiding drag-and-drop complexity. All rendering is done through direct DOM innerHTML replacement or SVG element creation via `document.createElementNS`, with no framework dependency.
