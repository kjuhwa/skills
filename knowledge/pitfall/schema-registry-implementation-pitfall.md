---
name: schema-registry-implementation-pitfall
description: Common failures when building schema registry tooling — stale caches, compatibility mode mismatches, and misleading matrix symmetry.
category: pitfall
tags:
  - schema
  - auto-loop
---

# schema-registry-implementation-pitfall

The most dangerous pitfall in schema registry visualization is **assuming the compatibility matrix is symmetric**. In these apps the matrix uses `compat[reader][writer]`, and for BACKWARD or FORWARD modes, the relationship is inherently directional: a v3 reader can decode v1 data (upper triangle = compatible), but a v1 reader cannot decode v3 data (lower triangle = incompatible). If you accidentally render the matrix as symmetric or swap the reader/writer axes, the tool will give operators false confidence that a consumer rollback is safe when it isn't. Always label axes explicitly ("Reader version" on rows, "Writer version" on columns) and test with a known asymmetric case like a field-addition-only BACKWARD subject.

A second pitfall is **hardcoding compatibility data instead of computing it from field diffs**. All three apps use static data arrays, which works for demos but breaks the moment someone registers a new version. In production tooling, compatibility must be derived by diffing adjacent schemas: compare field sets, check for type widening/narrowing, verify default values exist for added fields, and detect enum value removals. Without this, the matrix becomes stale within one deploy cycle. The timeline view suffers the same issue — the `change` description should be auto-generated from the structural diff (e.g., "Added field `roles` (array<string>, default=[])") rather than manually authored.

A third pitfall is **ignoring the NONE and FULL compatibility modes** in the UI. Many implementations optimize for BACKWARD (the Confluent default) and render FORWARD or FULL subjects incorrectly. FULL compatibility requires both forward AND backward checks — the matrix for a FULL subject should show degradation symmetrically in both triangles. NONE subjects have no compatibility guarantees at all, meaning every non-diagonal cell could be 0, and the timeline should visually warn that any consumer upgrade is a breaking change. Failing to surface this distinction means operators treat all subjects as equally safe to evolve, leading to runtime deserialization failures in consumers that weren't upgraded in lockstep.
