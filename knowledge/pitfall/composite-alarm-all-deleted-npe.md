---
name: composite-alarm-all-deleted-npe
version: 0.1.0-draft
tags: [pitfall, composite, alarm, all, deleted, npe]
category: pitfall
summary: Composite/aggregated monitors must validate their child set before reducing — empty aggregation throws NPE
source:
  kind: project
  ref: cygnus@cbb96a6dfff
confidence: medium
---

# Composite Monitor With All Children Deleted

## Fact
When every child alarm of a composite alarm monitor is deleted, the aggregation step receives an empty collection and throws NPE if the reducer assumes `result != null`.

## Why
Aggregation code was written assuming "at least one child exists" — a reasonable steady-state assumption that fails during bulk deletes and tombstone cascades.

## How to apply
- In any reduce/aggregate path over children of a composite entity, guard with `if (children.isEmpty()) { clearParentState(); return; }`.
- Prefer clearing the parent's aggregated state to throwing; orphaned composite parents should be explicitly decommissioned, not crash the collector.
