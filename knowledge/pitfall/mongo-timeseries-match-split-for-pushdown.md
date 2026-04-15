---
name: mongo-timeseries-match-split-for-pushdown
category: pitfall
summary: "On MongoDB time-series collections, combining timestamp range + metadata filters in a single `$match` disables bucket-level push-down — split into two sequential `$match` stages (timestamp first, metadata second) so the optimizer can synthesize `control.*.timestamp` bounds."
scope: global
source:
  kind: project
  ref: lucida-widget@595f57b
confidence: high
tags: [mongodb, time-series, query-optimization, aggregation]
---

# Combined `$match` on timestamp + metadata defeats time-series push-down

## Fact
On MongoDB time-series collections, putting `timestamp` range filters **together** with metadata filters in a single `$match` stage prevents the optimizer from converting the `timestamp` predicate into `control.min.timestamp` / `control.max.timestamp` bucket-index bounds. The aggregation then scans all buckets in the metadata slice instead of the intended time window.

## Why
The time-series optimizer rewrites a `$match` on `timestamp` into bucket-level index bounds **only when it can prove the predicate is purely on timestamp**. Mixing unrelated fields in the same stage disables the rewrite.

## How to apply
Split into two sequential stages — timestamp first, metadata second:
```javascript
{ $match: { timestamp: { $gte: start, $lt: end } } },
{ $match: { "meta.resourceId": id, "meta.metric": m } }
```
Preserves correctness, enables push-down. Evidence: in lucida-widget the split changed query plans from full-slice scan to bounded `control.*.timestamp` scan.

## Counter / Caveats
- Verify with `explain("executionStats")` — look for `control.min.timestamp`/`control.max.timestamp` bounds, not `[MinKey, MaxKey]`.
- MongoDB version matters; behavior observed on 8.2.x.

## Evidence
- Commit `595f57b` — "$match 분리 (timestamp-first 패턴)" in lucida-widget.
