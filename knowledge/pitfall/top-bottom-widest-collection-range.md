---
category: pitfall
summary: For Top/Bottom selection queries, pick the collection whose bin granularity covers the widest range, not the finest-grained one
source:
  kind: project
  ref: lucida-performance@0536094
confidence: medium
---

# Top/Bottom: select the widest-range collection, not the narrowest

## Fact

Time-series data is stored in multiple collections/views: raw, minute, hour, day. For "Top N resources by metric X over range R", the service selects the **coarsest** collection whose bin interval still fully covers `R`, rather than always using raw/minute.

## Why

Top/Bottom requires sorting over all candidate resources in the range. Using the minute-level collection for a 30-day window forces sorting millions of rows in memory; the hour or day view has pre-aggregated the same signal at a small loss of precision, which is acceptable for *ranking* (the relative order is preserved) even though the absolute values differ slightly.

## How to apply

- When adding a new ranking/selection query: walk collection candidates from coarsest to finest, pick the first whose interval ≤ `rangeMs / minBuckets`.
- Do **not** hardcode "use minute view"; large ranges will OOM or time out.
- If a user explicitly requests raw-precision ranking, gate it behind a flag and a range-size guard.
- Unit tests must exercise at least one range that forces the hour and one that forces the day view, otherwise regressions in the selection logic go unnoticed.

## Evidence

- `dao/MeasurementMetricRepositoryImpl.java` around the `getTopSearchCollectionName` / range-based view selection logic.
- Commit `0ac67f8`: "getTopSearchCollectionName(startTime, endTime) 성능 개선을 위한 상위 컬렉션 사용 메소드 보류".
- Commit `4317686`: "조회 성능 개선(Top, Bottom 대상 선정시 collection을 가능하면 가장 넓은 범위 선택되게 수정)".
