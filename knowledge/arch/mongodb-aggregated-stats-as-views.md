---
version: 0.1.0-draft
name: mongodb-aggregated-stats-as-views
description: Precomputed hour/day statistics exposed as MongoDB read-only views instead of physical collections to simplify reads and keep them consistent with source
category: arch
source:
  kind: project
  ref: lucida-performance@89d0577
tags: [mongodb, views, aggregation, time-series]
confidence: high
---

# Fact
Hour- and day-aggregated statistics are published as **MongoDB views**
(`measurement_metric_hour_view`, `measurement_metric_day_view`), not as separate
physical collections. Readers query the view name as if it were a collection; the
view's defining pipeline re-reads the source each time or is materialized by a separate
job.

**Why:** Views decouple the read contract from the storage shape. The aggregation
pipeline can change (bin size, projection, filter) without migrating readers. When the
source collection's shape changes, the view's pipeline is the single point to update,
avoiding drift across N repositories. Chosen after moving from raw hour/day tables
(commit `89d0577`, issue `#112049`); a similar definition-view was introduced in
`81fb8de` for `measurement_def_view`.

**How to apply:** When you see a new "give me X bucketed to Y" read requirement in a
MongoDB-backed service, prefer a view over a physical collection unless write
throughput on the aggregated shape is high. Views are read-only; aggregations inside
the view pipeline are re-evaluated per query, so benchmark before shipping a view over
a hot, large-cardinality source.

# Counter / Caveats
- On-demand view evaluation can be slower than a materialized collection; for very
  hot reads, use `$merge` to materialize on a schedule and keep the *read shape*
  stable anyway.
- Views cannot be indexed directly; they inherit the source collection's indexes.
  Pipeline stages that block index usage (`$addFields` before `$match`) silently kill
  performance.
