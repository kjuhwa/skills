---
name: schema-registry-visualization-pattern
description: Multi-panel visualization combining schema tree, version timeline, and compatibility matrix for schema registry exploration
category: design
triggers:
  - schema registry visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# schema-registry-visualization-pattern

Schema registry UIs benefit from a three-panel layout that exposes the registry's inherent dimensions: subject hierarchy (left nav tree grouping by namespace/topic), version history (horizontal timeline with BACKWARD/FORWARD/FULL compatibility badges per version transition), and field-level diff (right pane rendering Avro/Protobuf/JSON Schema as collapsible tree with added/removed/modified field highlights). Use color semantics consistently across panels: green for additive/backward-compatible changes, amber for potentially breaking (field renames, type widening), red for breaking (required field removal, type narrowing, enum value removal).

For the evolution timeline specifically, render each version as a node on a horizontal axis with edges labeled by compatibility mode, and overlay a "compatibility boundary" line showing which versions a consumer pinned to version N can still read. Hover states should reveal the specific schema-resolution rules that apply (default values filling missing fields, aliases resolving renames). The compatibility checker panel should show a side-by-side schema diff with inline annotations explaining *why* a change breaks compatibility in a given mode — not just that it does — since this is the primary learning goal users come to a registry explorer with.

Field-level rendering must handle nested records, unions (especially `["null", T]` optionality), logical types (decimal, timestamp-millis), and schema references (Protobuf imports, Avro named type references). Flatten on demand but preserve the ability to drill into referenced schemas without losing scroll position in the parent.
