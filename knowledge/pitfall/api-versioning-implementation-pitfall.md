---
version: 0.1.0-draft
name: api-versioning-implementation-pitfall
description: Common traps when building API version visualizations: off-by-one lifecycle states, diff semantic loss, and traffic share math
category: pitfall
tags:
  - api
  - auto-loop
---

# api-versioning-implementation-pitfall

The most frequent pitfall is conflating **deprecation** with **sunset**. Deprecation is an announcement (version still works, clients should migrate); sunset is the actual shutdown. Treating them as a single date produces misleading timelines where consumers think they have no grace period. Always model them as two distinct dates and render the interval between them as a distinct "deprecated-but-live" band, typically with a diagonal hatch pattern. Similarly, "beta" and "stable" should not be a boolean — alpha/beta/rc/stable is a four-state enum, and the timeline must handle overlap (v2 can be in beta while v1 is still stable).

A second trap is losing semantic information during diff rendering. If you diff two OpenAPI specs as raw JSON strings, reordering of object keys shows up as spurious changes and a renamed field appears as delete+add instead of a rename. Parse the spec into a normalized AST (sort keys, resolve `$refs`) before diffing, and run a rename-detection pass that matches removed+added pairs with identical types and similar names. Without this, users drown in noise and miss the actual breaking changes.

Third, traffic share percentages must sum to 100% per time bucket — naive per-version smoothing or interpolation breaks this invariant and produces stacked areas with visible gaps or overlaps. Always normalize after smoothing, and when a version first appears or finally disappears, avoid abrupt vertical cliffs by backfilling zero-value points one bucket before/after its active window so the stacked area renders a clean ramp rather than a step.
