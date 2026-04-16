---
name: schema-registry-implementation-pitfall
description: Common mistakes when modeling schema compatibility rules and version resolution in registry tooling
category: pitfall
tags:
  - schema
  - auto-loop
---

# schema-registry-implementation-pitfall

The most frequent pitfall is conflating BACKWARD and FORWARD compatibility directions. BACKWARD means new schema can read old data (consumer upgraded first — safe to add optional fields with defaults, remove fields); FORWARD means old schema can read new data (producer upgraded first — safe to add fields, remove optional fields). Getting the arrow direction wrong flips every compatibility verdict in the UI. Always anchor the rule to "which side upgraded first" rather than memorizing which changes are "allowed," because the allowed set inverts between the two.

A second pitfall is ignoring the TRANSITIVE variants. Non-transitive modes only check against the immediately previous version, so a subject can accumulate a chain where v1→v2 is compatible and v2→v3 is compatible but v1→v3 is not — consumers pinned to v1 silently break when v3 is registered. Visualizations that only draw edges between adjacent versions hide this; the timeline should render the transitive compatibility closure explicitly, typically as a matrix or as "reachability" shading from each version node.

A third pitfall is treating default values as cosmetic. In Avro, a field's default value is what makes adding it backward-compatible — without a default, old data lacks the field and new readers have no fallback, so the change breaks compatibility even though structurally it "just adds a field." Protobuf handles this via proto3's implicit defaults, and JSON Schema via `default` keyword semantics that most validators ignore at validation time but registries honor at resolution time. The checker must surface the default explicitly in the diff, not just the field name and type, because the presence/absence of a default is often the entire difference between a compatible and breaking change.
