---
name: schema-registry-visualization-pattern
description: Master-detail and matrix layouts for browsing Avro/JSON schemas, their version history, and cross-version compatibility.
category: design
triggers:
  - schema registry visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# schema-registry-visualization-pattern

Schema registry UIs converge on three complementary views that should be composed together. The **Explorer** view uses a sidebar list / main detail split: the left panel renders `namespace.Name` with version badge and compatibility mode tag (`BACKWARD`, `FULL`, `FORWARD`, `NONE`), while the right panel shows a field table with columns for field name, type (rendered as a tag/chip), and doc string. Click-to-select with an `.active` class highlight keeps context visible. The schema data model needs `name`, `namespace`, `version`, `compatibilityLevel`, and a `fields[]` array where each field carries `name`, `type`, and `doc` — this covers Avro, Protobuf, and JSON Schema registries uniformly.

The **Timeline** view plots version evolution on a horizontal canvas. Each version is a circle node positioned proportionally along a left-to-right axis, with radius scaled by field count (`8 + fields * 2` px) to visually convey schema growth. Date labels sit below each node, version labels above. A tooltip on hover shows the change description (e.g., "Added roles array", "Widened amount to double"). A `<select>` dropdown switches between subjects. The key insight is using `devicePixelRatio`-aware canvas sizing with a `resize` listener so the timeline stays crisp on HiDPI displays. Store version history as an array of `{v, date, fields, change}` objects per subject.

The **Compatibility Matrix** uses an SVG heatmap grid where rows = reader versions and columns = writer versions. Each cell gets a numeric compatibility level (0 = incompatible/red, 1 = partial/yellow, 2 = full/green) rendered as a colored `<rect>` with a symbol overlay (`✗`, `~`, `✓`). Hover reveals a prose explanation panel below the matrix. A separate legend component maps the three states. This reader-vs-writer framing is specific to schema registries — it directly models the Confluent compatibility guarantee: "can a consumer using schema vN read data written with schema vM?"
