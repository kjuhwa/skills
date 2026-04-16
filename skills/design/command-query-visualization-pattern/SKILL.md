---
name: command-query-visualization-pattern
description: Canvas-based dual-lane particle animation showing command (write) and query (read) paths through a CQRS topology.
category: design
triggers:
  - command query visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# command-query-visualization-pattern

Render CQRS flow as a directed node graph on an HTML Canvas where nodes represent architectural boundaries — Client, Command Bus, Query Bus, Write Model, Read Model, and Event Store. Edges connect them in the canonical CQRS topology: client fans out to both buses, the command bus feeds the write model, the write model emits to the event store, the event store projects onto the read model, and the query bus reads from it directly. Use animated particles traveling along edges to show live dispatches, color-coded by intent: red/pink (`#f97583`) for commands, blue (`#79c0ff`) for queries, and green (`#6ee7b7`) for domain events. Stagger particle creation with `setTimeout` delays (e.g., 0 → 400 → 800 → 1200ms) to convey the sequential hop through each stage of the pipeline.

For the timeline variant (journal view), replace the node graph with a horizontally scrolling swim-lane canvas where each lane represents a type (command, query, event). Plot entries as dots at `x = canvasWidth - (age / timeWindow) * canvasWidth`, producing a right-to-left scrolling effect over a configurable window (e.g., 30 seconds). Repaint at a fast interval (~200ms) independent of data arrival to keep the scroll smooth. For the separator variant, use a two-column DOM layout with an inline SVG ratio bar: render two adjacent `<rect>` elements whose widths are `commandCount/total * 100%` and `queryCount/total * 100%` respectively, updating on each classification. All three views share a dark theme (`#0f1117` background, `#1a1d27` panels) and the same three-color semantic palette, making them composable into a single dashboard.

Across all patterns, pair the visual with a scrolling event log (`prepend` new entries, cap at ~40 DOM nodes to avoid memory bloat). Each log line carries a timestamp, a 3-character type prefix (CMD/QRY/EVT), and the operation name. CSS classes per type (`.log-cmd`, `.t-cmd`, `.item-cmd`) apply the color and a translucent background tint (`color + '18'` or `'22'` hex alpha) for scan-ability. Entry animations (`fadeIn`, `slideIn`) use short CSS transforms (0.25–0.3s) to draw the eye without disrupting readability.
