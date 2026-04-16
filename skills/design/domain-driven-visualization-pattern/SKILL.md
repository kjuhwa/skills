---
name: domain-driven-visualization-pattern
description: Multi-perspective canvas for rendering bounded contexts, aggregates, and domain events with interactive drill-down
category: design
triggers:
  - domain driven visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# domain-driven-visualization-pattern

Domain-driven visualizations (explorer, event-storm, aggregate-flow) share a three-layer canvas pattern: a **context map layer** showing bounded contexts as color-coded regions, an **aggregate layer** overlaying entities/value objects as nested nodes within each context, and an **event/command flow layer** drawn as directed edges with orange sticky-note semantics (events = orange, commands = blue, aggregates = yellow, policies = purple, read models = green) borrowed from Alberto Brandolini's Event Storming conventions. Use SVG or Canvas with zoom/pan (d3-zoom or react-flow) because aggregate graphs quickly exceed 50+ nodes.

Implement selection and drill-down via a **focus ring + detail panel** combo: clicking an aggregate dims unrelated contexts to ~20% opacity, highlights upstream commands and downstream events with animated edge pulses, and opens a right-side drawer showing invariants, command handlers, and event list. For aggregate-flow specifically, render the event timeline as a horizontal swim-lane per aggregate with time advancing left-to-right so causality is visually obvious. Color by context (consistent palette across all three apps) rather than by type — this lets users recognize "payment context is red" across explorer, storm, and flow views.

Preserve a **shared domain model JSON schema** (`contexts[]`, `aggregates[]`, `events[]`, `commands[]`, `policies[]`, `readModels[]`, `relations[]` with type: ACL/OHS/Conformist/SharedKernel) so all three visualizations consume the same data source. This avoids divergence when the domain evolves and makes it trivial to add a fourth view (e.g., dependency matrix or hotspot heatmap).
