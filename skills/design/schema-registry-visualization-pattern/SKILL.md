---
name: schema-registry-visualization-pattern
description: Three complementary views (explorer tree, evolution timeline, compatibility matrix) for schema registry UIs
category: design
triggers:
  - schema registry visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# schema-registry-visualization-pattern

Schema registry tooling benefits from a tri-view composition where each view answers a distinct question: an **explorer** (subject/version tree with field drill-down) answers "what schemas exist and what do they contain?", a **timeline** (horizontal version lanes with compat-mode bands and breaking-change markers) answers "how did this subject evolve?", and a **compatibility matrix** (reader × writer grid with BACKWARD/FORWARD/FULL cell states) answers "can producer X talk to consumer Y?". Co-locating these around the same subject selector lets users pivot between structural, temporal, and relational perspectives without losing context.

Render schemas as collapsible Avro/Protobuf/JSON-Schema trees with type badges (record, enum, union, optional) and diff-color coding — green for added fields, red for removed, amber for type-narrowed or default-changed. Timelines should pin the current `compatibility` setting as a header band (NONE, BACKWARD, FORWARD, FULL, TRANSITIVE variants) and draw vertical lines at schema IDs where the rule changed, since rule changes often explain why a later evolution was allowed. The matrix should encode three states — compatible, compatible-with-default, incompatible — plus a fourth "not-evaluated" state for missing version pairs, avoiding the trap of showing false greens on untested combinations.

Use a single `SubjectContext` provider holding `{ subject, versions[], currentVersionId, compatMode }` so all three views subscribe to the same selection. Support URL-hash deep links like `#subject=orders-value&v=7&view=matrix` so users can share specific incompat findings. Keep each view independently reloadable — registry fetches for timelines can be expensive (N version GETs), so gate the timeline behind lazy expansion rather than loading it eagerly alongside the explorer.
