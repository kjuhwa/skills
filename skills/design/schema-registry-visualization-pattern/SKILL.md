---
name: schema-registry-visualization-pattern
description: Three complementary visual encodings for schema registry data — explorer tree, version timeline, and compatibility heatmap.
category: design
triggers:
  - schema registry visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# schema-registry-visualization-pattern

Schema registry UIs work best as a trio of views that each answer a different question. The **Explorer** uses a master-detail layout: a sidebar lists subjects with version and serialization type (AVRO/JSON/PROTOBUF) as secondary labels, while the detail pane renders schema metadata cards (subject, version, compatibility level) above a syntax-highlighted JSON/Protobuf dump. Use the accent color (`#6ee7b7` green) exclusively for schema-domain identifiers — subject names, field type annotations, and compatibility badges — so the eye immediately separates registry metadata from raw schema structure. The sidebar item's `active` state and the metadata cards should share the same `#1a1d27` panel background to visually link selection to detail.

The **Version Timeline** maps schema evolution onto a horizontal canvas axis. Each version is a circle whose radius scales with field count (`14 + fields * 3` px), giving an instant visual read on schema growth over time. Versions connect via a baseline stroke, and date labels sit below each node. A tooltip on hover surfaces the change description ("Added metadata field", "Renamed discount to discountPct"). The critical UX detail: wire a `<select>` per subject so the timeline redraws for each topic — schema registries can hold hundreds of subjects, so the per-subject drill-down prevents overload. Use `devicePixelRatio` scaling on canvas for crisp rendering on HiDPI displays.

The **Compatibility Matrix** is a grid heatmap with subjects on the Y-axis and version slots on the X-axis. Each cell is color-coded: green PASS, amber WARN, red FAIL. Cells for versions that don't exist yet render as dark placeholders with `"—"`. On hover, each cell shows a contextual message explaining the compatibility verdict ("Breaking change detected — consumers may fail"). The grid uses `grid-template-columns: 140px repeat(var(--cols), 1fr)` with `aspect-ratio: 1` cells and a `scale(1.15)` hover effect to make the matrix scannable. Include a legend below the grid. This trio — browse, trace evolution, audit compatibility — covers the three core schema-registry operator workflows.
