---
name: schema-registry-implementation-pitfall
description: Common pitfalls when building schema registry visualization tools — compatibility semantics, version depth skew, and multi-format rendering traps.
category: pitfall
tags:
  - schema
  - auto-loop
---

# schema-registry-implementation-pitfall

The most dangerous pitfall in schema registry UIs is **treating compatibility levels as simple labels** when they actually have directional semantics. BACKWARD means new schema can read old data, FORWARD means old schema can read new data, and FULL means both — but the `_TRANSITIVE` variants extend that guarantee across all prior versions, not just the immediately preceding one. A compatibility matrix that shows a green PASS for v3-to-v2 but doesn't check v3-to-v1 will give false confidence under a BACKWARD (non-transitive) policy. When building compatibility visualizations, the matrix must either simulate pairwise checks for transitive modes or clearly indicate that only adjacent-version checks are shown. Failing to surface this distinction leads operators to approve breaking evolutions that poison downstream consumers still reading from v1.

The second pitfall is **assuming uniform version depth across subjects**. Real registries have subjects ranging from v1 (just created) to v20+ (heavily evolved). If the timeline or matrix uses fixed-width slots for all versions, low-version subjects waste space while high-version subjects overflow. The apps handle this by capping the matrix at 5 version columns and randomly assigning `maxV` per subject — but a production tool must either paginate or dynamically size columns. Similarly, the Canvas timeline computes gap spacing from version count (`(width - padding*2) / (count - 1)`), which collapses to a single centered dot for v1-only subjects — an edge case that needs explicit handling to avoid a `NaN` position.

The third trap is **multi-format schema rendering**. A single registry may hold AVRO records (nested unions, logical types), JSON Schema (with `$ref`, `additionalProperties`, `enum` constraints), and Protobuf (field numbering, oneof, nested messages). Dumping all three as `JSON.stringify` works for AVRO and JSON Schema but produces misleading output for Protobuf, whose field ordering and numbering carry semantic meaning that a generic JSON tree flattens away. Production tools should detect the schema type and switch to a format-aware renderer — showing field numbers for Protobuf, collapsible unions for AVRO, and `required` vs. optional highlighting for JSON Schema. Treating all schemas as "just JSON" will confuse operators who need to reason about wire compatibility.
