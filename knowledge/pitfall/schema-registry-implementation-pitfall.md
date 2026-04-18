---
version: 0.1.0-draft
name: schema-registry-implementation-pitfall
description: Common mistakes when modeling compatibility checks and version semantics in registry tools
category: pitfall
tags:
  - schema
  - auto-loop
---

# schema-registry-implementation-pitfall

The biggest pitfall is conflating **subject-level compatibility mode** with **per-version compatibility direction**. BACKWARD means "new reader can read old data," FORWARD means "old reader can read new data," and FULL is both — but tools frequently render a single "compatible ✓/✗" badge without specifying direction, so users misinterpret a FORWARD-mode subject as broken when it has a BACKWARD-incompatible change that is actually legal. Always show the mode and the evaluated direction together, and run the check in the direction the mode dictates, not both.

A second trap is ignoring **default values and Avro aliases** in the diff. Adding a required field is breaking *unless* it has a default; renaming a field is breaking *unless* an alias is declared pointing to the old name. Naïve field-name diffing flags both as breaking and floods the UI with false positives. The check must parse the schema's default/alias metadata and apply the same resolution rules the registry uses (`AvroCompatibilityChecker`, Protobuf's `reserved` ranges, JSONSchema's `additionalProperties` handling) — otherwise the tool disagrees with the registry it claims to model.

A third pitfall is **transitive vs. non-transitive** compatibility. `BACKWARD` checks only against the immediately previous version; `BACKWARD_TRANSITIVE` checks against all prior versions. Simulations that only compare v(n) to v(n-1) will miss real-world failures where v5 is backward-compatible with v4 but not with v2, and the subject is in transitive mode. Store the full version chain and evaluate against every prior version when the mode ends in `_TRANSITIVE`.
