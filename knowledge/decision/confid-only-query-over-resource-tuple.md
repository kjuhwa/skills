---
name: confid-only-query-over-resource-tuple
version: 0.1.0-draft
tags: [decision, confid, only, query, over, resource]
category: decision
summary: Performance queries key off `confId` (config id) whenever available, falling back to (resourceType, resourceName) only when confId is absent
source:
  kind: project
  ref: lucida-performance@0536094
confidence: medium
---

# Prefer confId over (resourceType, resourceName) tuple

## Fact

`MeasurementMetricRepositoryImpl` checks `confIds != null && !confIds.isEmpty()` first and routes through `findConfInfoListWithConfIds`. Only when the caller omits `confIds` does it fall back to the legacy `resourceType + resourceName` criteria.

## Why

The tuple (resourceType, resourceName) is ambiguous in practice:

- Some metrics exist in `conf_info` without a `resourceType` value — the tuple lookup misses them.
- `resourceName` collisions across tenants used to require additional filtering, which leaked into the hot path.
- `confId` is a single indexed primary key on `conf_info`; it's both faster and unambiguous.

The multi-step migration (`#106476`, several commits) converged on "always pass confIds from the UI, use them directly".

## How to apply

- New callers must pass `confIds`. Do not reintroduce `resourceType+resourceName` as the primary lookup.
- UI/API layers should resolve names → confIds before calling the measurement service.
- If `confIds` and `(resourceType, resourceName)` are both supplied, honor `confIds` and log a warning — do not AND them.
- Keep the fallback path only for custom-SQL definitions where confId mapping genuinely does not apply.

## Evidence

- `dao/MeasurementMetricRepositoryImpl.java` confIds branch.
- Commit series `#106476`: "모든 경우에 confID로 검색되도록 수정" (several follow-up fixes).
- Commit `9ea401d`: "사용자 정의 SQL resourceName 입력시 성능 조회 되도록 개선" — confirms the custom-SQL fallback is a separate case.
