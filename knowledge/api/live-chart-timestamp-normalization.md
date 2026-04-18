---
name: live-chart-timestamp-normalization
version: 0.1.0-draft
tags: [api, live, chart, timestamp, normalization]
slug: live-chart-timestamp-normalization
category: api
summary: LIVE charts accept `normalizeTimestamp` + `normalizeIntervalMs` to align per-agent millisecond offsets into a single x-axis
confidence: medium
source:
  kind: project
  ref: lucida-measurement@bc4ed72
---

# Fact
Multiple agents publish raw metrics with slightly different millisecond offsets inside each collection cycle. In LIVE mode this makes multi-line charts look shattered (one line per unique timestamp). The query API exposes:
- `normalizeTimestamp: boolean` — round timestamps to a common grid.
- `normalizeIntervalMs: long` — the grid size (e.g. 5000 for 5-second alignment).

Implementation floors each point's timestamp to the interval, groups duplicates inside the same bucket, and averages colliding values. This is a **query-time** normalization; raw storage is untouched.

# Evidence
- `TopNResourceMetricQueryParams.java` fields with inline javadoc documenting the mechanism.
- Commit `e6618f5` (#114249) — "Raw 데이터 차트 - 데이터가 있는 경우 실제 timestamp 사용하도록 개선" (the inverse: when you *don't* normalize, surface the actual collected timestamp).

# How to apply
- Any new multi-series LIVE endpoint should accept both params; do not hardcode a normalization interval.
- Default `normalizeIntervalMs` should match the chart's intended x-step, not the collection interval.
- For single-series raw charts, prefer actual timestamps (see #114249) — normalization is a multi-series concern.

# Counter / Caveats
- Averaging within a bucket is a choice; for max/min-preserving displays, consumers may need a separate aggregation flag.
