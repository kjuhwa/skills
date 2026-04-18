---
version: 0.1.0-draft
tags: [decision, large, range, query, raw, collections]
name: large-range-query-raw-collections
description: For long time-range analytics over day-partitioned data, query the daily raw collections directly rather than going through an aggregated view to avoid query timeouts.
type: decision
category: decision
source:
  kind: project
  ref: lucida-domain-apm@11c3887f
confidence: high
---

**Fact.** When data is partitioned by day (`apm_trace_20260415`, `apm_trace_20260416`, …) and a view unions recent partitions, the view works for short ranges but times out past a threshold — the aggregation rebuilds the union per query, and MongoDB's planner does not always push predicates efficiently through `$unionWith`. Querying the daily collections directly and merging application-side is consistently faster past ~1h / 24h ranges.

**Why.** Views are ergonomic (one name, one query), but hide fan-out. For 24h you might union 2 shards; for 7d, 8 shards with their own indexes and memory pressure. Direct per-collection iteration lets you parallelize with a bounded pool, push `limit`/`sort` per collection, and short-circuit. In lucida-domain-apm, commits `#119255` / `#117913` pivoted Database TopN queries from views to daily collections specifically to resolve timeouts on longer ranges.

**How to apply.**
- Identify the request's time range. If it exceeds a tuned threshold (1h / 24h are common), bypass the view.
- Compute target collection names from the range (`yyyyMMdd` suffix). Query each with the same predicate. Merge.
- Push `limit` and `sort` into each per-collection query so you never pull a full day into memory.
- Keep the view path for short ranges — it's simpler and often faster below the threshold.
- Bound parallelism (e.g. 8 collections at a time); a 90-day query hitting 90 collections in parallel will exhaust the pool.

**Counter / Caveats.** Application-side merging reintroduces correctness hazards: sort stability across shards, `limit` semantics when different collections have different cardinalities. Write tests that compare view-path vs direct-path results on overlapping ranges. If you own the data model, consider native time-series collections or columnar archival before adding another partitioning layer.
