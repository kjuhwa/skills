---
version: 0.1.0-draft
name: mongo-timeseries-forced-hint-kills-pushdown
category: pitfall
summary: "Forcing `hint(indexName)` on a MongoDB time-series aggregation bypasses the optimizer's bucket-index rewrite — the plan scans every bucket with `control.min/max.timestamp = [MinKey, MaxKey]` instead of honoring the timestamp predicate."
scope: global
source:
  kind: project
  ref: lucida-widget@ab660fd
confidence: high
tags: [mongodb, time-series, query-hint, query-optimization]
---

# Forcing an index `hint` on time-series collections causes full-range bucket scan

## Fact
When a `hint(indexName)` is forced on a MongoDB time-series collection, the resulting plan shows `control.min.timestamp = MinKey` and `control.max.timestamp = MaxKey` — every bucket in the collection is fetched, regardless of the actual timestamp predicate.

## Why
The forced hint bypasses the time-series optimizer's rewrite step. Without that rewrite, the engine cannot synthesize bucket-level timestamp bounds from the user's `$match`, so it scans the entire bucket space.

## How to apply
- Default: **do not hint** time-series aggregations. Let the optimizer do push-down.
- If you must hint for a non-timestamp selectivity reason, measure with `explain` and confirm bucket bounds are still tight; otherwise drop the hint.
- Pattern used in lucida-widget: dynamic hint selection + fallback to no-hint on hint failure or when hint would cover only the "first group" stage.

## Counter / Caveats
- Pre-8.x behavior may differ; confirm on your server version.
- Non-time-series collections still benefit from hints normally.

## Evidence
- Commit `ab660fd` — "시계열 컬렉션에서 hint 강제하면 control.min/max.timestamp가 [MinKey, MaxKey]"
- Commit `7f6d8eb` — "Index Hint 동적 선택 (역효과 수정)"
