---
slug: confid-vs-resourceid-routing
category: api
summary: Queries support both `configIds` (tenant/policy scope) and `resourceId` (agent scope); filter routes to different Mongo match fields
confidence: medium
source:
  kind: project
  ref: lucida-measurement@bc4ed72
---

# Fact
Time-series query endpoints accept two alternative scopings:
- `configIds` → matches `META_CONF_ID` (collection-policy / tenant-level grouping).
- `resourceId` / `resourceIdList` → matches `META_RESOURCE_ID` (physical agent-level identity).

Both are legitimate, depending on the caller's view (admin console vs per-resource detail page). Each endpoint's routing branch picks **one** match field, and filtering by `configIds` was a repeated regression surface (#117605).

# Evidence
- Commit `23c7589` (#117605) — "Fix: ResourceSelector 내 configIds 필터링 동작하도록 수정"
- Commit `afc05b7` — "Multi-dimension/Multiple-resource API에 configIds 필터링 추가"
- Commit `2508702` — "TOP N API configIds 필터링 추가"
- Commit `153f65e` — "configIds 필터링 누락 파일 커밋" (note: "missing filter file commit" — regression from split PR)

# How to apply
- Any new query endpoint must explicitly document which scoping it accepts, and cover both in integration tests.
- When adding a new query shape (e.g. multi-dim), add `configIds` support up-front — retrofitting repeatedly produces bugs.
- If both are passed, the semantics are AND; document this and test it.

# Counter / Caveats
- The historical pattern is that `configIds` gets forgotten on new endpoints; treat it as a checklist item during review.
