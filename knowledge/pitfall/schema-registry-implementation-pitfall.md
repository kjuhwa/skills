---
name: schema-registry-implementation-pitfall
description: Conflating schema ID, version, and subject leads to wrong compatibility verdicts and broken deep-links
category: pitfall
tags:
  - schema
  - auto-loop
---

# schema-registry-implementation-pitfall

The most common implementation bug is treating `schemaId`, `version`, and `subject` as interchangeable. **Schema ID is global and immutable** — the same schema body registered under two subjects returns the *same* ID. **Version is per-subject and sequential** but can have gaps if versions are soft-deleted. **Subject is the compatibility boundary** — compatibility rules apply within a subject, never across subjects, so a matrix that compares versions from different subjects is meaningless. UIs that key state on `version` alone will show wrong data the moment a user switches subjects, and URL deep-links built on version-only will silently resolve to the wrong schema after a soft-delete renumbering.

A second pitfall is **misreading the compatibility direction**. BACKWARD means "new schema can read old data" (consumer upgrades first); FORWARD means "old schema can read new data" (producer upgrades first). Swapping these inverts every cell in the matrix and produces confidently-wrong guidance. The `_TRANSITIVE` variants check against *all* prior versions, not just the immediate predecessor — a matrix that only validates N vs N-1 will show green where the registry would actually reject the registration. Always render the active mode prominently and evaluate against the full version set the mode implies.

Finally, **reference resolution is where naive renderers break**. Avro schemas with `references[]` must be resolved recursively before field diffing, or removed fields in a referenced schema appear as removed in every subject that references it — producing a flood of false breaking-change markers. Cache resolved schemas by `(subject, version)` tuple, detect cycles (self-references via union types happen more than you'd expect), and show unresolved references as a distinct "missing dependency" state rather than silently rendering an empty tree, which users will misread as "this schema has no fields."
