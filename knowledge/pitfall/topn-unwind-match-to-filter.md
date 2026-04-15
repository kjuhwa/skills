---
slug: topn-unwind-match-to-filter
category: pitfall
summary: TopN Mongo pipeline using `$unwind`+`$match` explodes documents; push predicate into `$filter` first
confidence: high
source:
  kind: project
  ref: lucida-measurement@bc4ed72
links:
  - mongo-aggregation-filter-optimization
---

# Fact
TopN time-window queries that combine `$unwind` of an array with a following `$match` on the unwound field scale as O(docs × array-length) in intermediate memory. Rewriting the pipeline to filter the array inline with `$filter` (then optionally `$unwind` the shrunk array, or skip unwind entirely via `$map`/`$reduce`) reduced pipeline cost dramatically.

# Evidence
- Commit `e46c3a0` — "Perf: MongoDB Aggregation Pipeline $unwind+$match → $filter 최적화"
- Commit `bc4ed72` — "Perf: TopN 쿼리 컬렉션 라우팅 최적화 — raw 뷰 하드코딩 제거" (same issue cluster #119500)
- Prior partial fix `dce39bf` / `ab8dbf1` (#112113) — "topn api 성능 이슈로 임시 빈컬렉션" — showed the cost surfaced as full-collection scans when the array filter was absent

# How to apply
- Any new pipeline touching a sub-document array with a predicate: start with `$filter`, not `$unwind`.
- When reviewing legacy pipelines for performance, grep for `$unwind` immediately followed by `$match` — that's the signature.
- Pair with collection routing (raw view vs hour collection) — getting the wrong tier amplifies this pathology.

# Counter / Caveats
- On small arrays (<10 elements per doc) the difference is noise; optimize by evidence (profile), not reflexively.
