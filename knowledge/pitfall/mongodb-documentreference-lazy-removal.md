---
version: 0.1.0-draft
name: mongodb-documentreference-lazy-removal
description: Spring Data MongoDB @DocumentReference (even with lazy=true) triggers N+1 queries on bulk reads; replace with explicit $lookup aggregation
category: pitfall
source:
  kind: project
  ref: lucida-alarm@d6ae7d27
confidence: high
linked_skills: []
tags: [mongodb, spring-data, documentreference, n-plus-one, aggregation, lookup]
---

**Fact:** Reading 1 000 `ActiveAlarm` documents with `@DocumentReference(lazy=true)` on the referenced `Alarm` required 1 001 MongoDB round-trips — the classic N+1 — because each referenced `Alarm` was fetched individually on access. Switching `lazy=true → false` only makes it eager-batched (still N+1 under the hood). The real fix is removing `@DocumentReference` entirely and performing an explicit `$lookup` join in the repository aggregation pipeline.

**Why:** `@DocumentReference` resolution is per-reference and does not batch across the parent collection on load. Aggregated query performance dropped from >1 s to <100 ms on representative data after the switch. Progressive removal across `ActiveAlarm`, `ComplexAlarmDefinition`, and `ProxyAlarmDefinition` shows this is a systematic anti-pattern in bulk-read domains.

**How to apply:**
- When the owning collection is queried in bulk (listings, grids, paginated APIs), avoid `@DocumentReference` entirely.
- Replace with a repository-impl method that runs the aggregation with `$lookup` and maps the joined document into a projection class.
- Ensure the joined field is indexed.
- For small, point-read result sets (< ~50 docs) `@DocumentReference` is often fine and simpler.

**Evidence:**
- Commit `03b0e192` — "Alarm DocumentReference 를 제거하고 lookup으로 조회"
- Commits `bac0443e`, `ce354df2`, `b784138a`, `36030299` — progressive `@DocumentReference` removal across entities.
- `CLAUDE.md` Performance Considerations section (alarm-status query latency target).
