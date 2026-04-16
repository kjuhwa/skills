---
name: materialized-view-implementation-pitfall
description: Common traps when modeling refresh semantics, staleness bounds, and concurrent query reads
category: pitfall
tags:
  - materialized
  - auto-loop
---

# materialized-view-implementation-pitfall

The most common modeling mistake is treating REFRESH as instantaneous. Real materialized views (PostgreSQL `REFRESH MATERIALIZED VIEW`, Oracle fast/complete refresh, Snowflake dynamic tables) take measurable time, and without `CONCURRENTLY` the view is exclusively locked for the duration — queries either block or read the pre-refresh snapshot depending on engine. Simulations that flip the view atomically at the refresh *start* instead of its *end* misrepresent staleness: a query arriving at t=refreshStart+100ms on a 2s refresh should still see the old snapshot, not the new one. Similarly, forgetting that non-CONCURRENT refreshes invalidate the old data entirely (brief unavailability window) vs CONCURRENT which keeps the old version readable is a frequent bug.

Incremental refresh has its own trap: not every view definition is incrementally maintainable. Aggregations with non-invertible functions (MIN/MAX over deletes, MEDIAN, DISTINCT COUNT without sketches) require full recompute even when the engine advertises "incremental". Demos that show smooth row-by-row delta application for arbitrary SQL mislead users — mark which view shapes actually support incremental maintenance (SUM, COUNT, simple joins on PK) vs those that silently fall back to full refresh.

Finally, staleness accounting is easy to get wrong under concurrent writes. The correct definition is `max(writeLsn of base rows not yet reflected)` — not wall-clock age since last refresh. A view refreshed 10ms ago can already be stale if a write landed 1ms ago. Expose both metrics (wall-clock age and LSN-lag) so viewers understand that refresh cadence bounds one but not the other, and that read-your-own-writes is impossible without synchronous refresh or query-time fallback to base tables.
