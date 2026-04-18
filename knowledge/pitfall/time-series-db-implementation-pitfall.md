---
version: 0.1.0-draft
name: time-series-db-implementation-pitfall
description: TSDB tools frequently corrupt their own UX by misusing timestamp precision, time zones, and rollup boundaries.
category: pitfall
tags:
  - time
  - auto-loop
---

# time-series-db-implementation-pitfall

The most common pitfall is **timestamp precision mismatch**. TSDBs variously store ns (Influx, Prometheus remote write), µs (Timescale), or ms (most JS clients, OpenTSDB); the ingest client and query client often disagree, silently truncating or zero-padding. Symptom: points appear to land "on the same timestamp" and overwrite each other, or queries return empty because the range filter `[t, t+1s)` in ms doesn't match points written in ns. Always normalize to ns at the storage boundary and convert at the UI boundary only — never mix units inside query-builder code. Equally dangerous: using `Date` objects in JS round-trips (which collapse to ms) for anything that was ingested at sub-ms precision.

The second pitfall is **rollup boundary aliasing**. When a dashboard queries `avg_over_time(metric[5m])` at a 1-minute step, each returned point averages a *sliding* 5-minute window, not aligned 5-minute buckets — so two adjacent points share 80% of their input data and the chart looks smoother than it is. Users interpret this as "the system is stable" when it's actually the query's smoothing artifact. Either align windows to the step (`time_bucket` / `__interval`) or label the chart explicitly as sliding-window. The same trap appears in ingest simulators: if you generate points at 10s cadence but the DB's default retention rolls up to 1m after 24h, tests replaying yesterday's data see 6× fewer points and every assertion about count breaks.

The third pitfall is assuming **monotonic timestamp ingest**. Real agents deliver out-of-order points (buffered retries, NTP jumps, clock skew across hosts), and most TSDBs reject or silently drop points older than their out-of-order window (Prometheus: 10m by default; Influx: configurable). Simulators that only write increasing timestamps never exercise this path, so late-arrival handling stays untested until production. Always inject ~1% out-of-order points in simulators, and make sure query results correctly reflect them once the DB re-sorts the block.
