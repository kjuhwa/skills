---
version: 0.1.0-draft
name: unit-enum-silent-filter
description: When metric rows are filtered out because their `unit` is not defined in a Java enum, the symptom is "items missing from the list UI" — no error, no log — and the root cause is upstream data adding units faster than the enum is updated
category: pitfall
source:
  kind: project
  ref: lucida-performance@f211d5e
tags: [enum, silent-drop, defensive-coding, observability]
confidence: high
---

# Fact
Mapping an external string (e.g. a unit name) onto a Java enum and *silently skipping*
rows whose value doesn't map is an observability dead-end: users see "my metric
disappeared" with no server error. This project hit it with the `Unit` enum — when a
new K8S / NMS unit appeared upstream, the list view dropped those metrics until the
enum was extended (commits `f211d5e`, `07dcd6b`, `1af64aa`, `e4fa6d3`).

**Why:** Defensive `Unit.fromString(s).orElse(null)` → filter-null is the common
reflex; it keeps the service "up" but makes data loss invisible. Silent filtering
shifts cost from "handle unknown now" to "debug missing row later", which is much more
expensive per incident.

**How to apply:**
- At minimum, **log a WARN with the offending string** and an identifier of the
  dropped row. A rate-limited counter (micrometer) on "unit.unknown" makes the growth
  visible before the next user complaint.
- Prefer a sentinel `Unit.UNKNOWN` that flows through the pipeline to the UI (labeled
  as "unknown unit"), rather than dropping the row — let the user see the metric and
  tell you the enum is stale.
- Pair with the `enum-whitelist-blocks-time-based-sqli` pitfall: on **input** paths
  you want strict reject; on **display** paths you want sentinel + log. Never swap.

# Counter / Caveats
- For fields that are genuinely security-sensitive (query field names, operator
  names), silent-drop is wrong *and* strict-reject is right — those are input paths.
  This pitfall is specifically about *display* paths where the external vocabulary
  legitimately grows over time.
