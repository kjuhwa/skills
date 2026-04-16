---
name: materialized-view-implementation-pitfall
description: Silent divergence between view and base when change-log capture is incomplete or refresh overlaps writes
category: pitfall
tags:
  - materialized
  - auto-loop
---

# materialized-view-implementation-pitfall

The most dangerous failure mode for materialized views is **silent divergence**: the view returns a number, the number looks plausible, but it no longer matches what a fresh recompute from the base would produce. This usually traces to incremental refresh strategies losing change-log entries — a dropped CDC event, a missed trigger fire during a transaction rollback, or a refresh that reads the change-log up to timestamp T while a write with timestamp T-ε is still in-flight. Because incremental refreshes apply deltas rather than recomputing, the error is sticky: it persists until a full refresh is forced, and by then nobody remembers when the drift started.

A second pitfall is **refresh overlap**: if a refresh takes longer than the refresh interval (common under write bursts or when the base table grows), a second refresh kicks off while the first is running. Depending on locking, you either get duplicate work (wasted), a serialized backlog (staleness balloons), or — worst — two refreshes racing to write the view with interleaved partial results. Always measure `refresh_duration / refresh_interval` as a health metric and alert when it exceeds ~0.5, long before it hits 1.0.

Third, the **read-during-refresh consistency question** is almost always answered wrong by accident rather than by design. If queries can hit the view mid-refresh, they may see a half-applied state (some rows updated to T+1, others still at T). PostgreSQL's `REFRESH MATERIALIZED VIEW CONCURRENTLY` solves this with a shadow table and atomic swap; naive implementations that `TRUNCATE + INSERT` do not. Decide explicitly whether your view offers snapshot-consistent reads or best-effort reads, document it, and test under concurrent load — don't let the answer be whatever the implementation happens to do today.
