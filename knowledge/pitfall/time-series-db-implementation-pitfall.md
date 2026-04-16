---
name: time-series-db-implementation-pitfall
description: Common failure modes when building TSDB visualization tools — unbounded memory, timestamp precision loss, and misleading downsampled charts.
category: pitfall
tags:
  - time
  - auto-loop
---

# time-series-db-implementation-pitfall

The most dangerous pitfall in browser-based TSDB tools is **unbounded memory growth from append-only data arrays**. A metric arriving every second generates 86,400 points per day; naively pushing to a JavaScript array will consume hundreds of megabytes within hours and eventually crash the tab. The fix is a circular buffer with a fixed capacity (typically 300-3,000 points for display) and a separate strategy for historical queries — fetch pre-downsampled data from the API rather than raw points. The tsdb-query-playground pattern is especially vulnerable because users can write queries spanning weeks of data; without server-side `GROUP BY time()` aggregation, the browser will attempt to render millions of points. Always enforce a maximum point count per query response and display a warning when results are truncated.

A subtler issue is **timestamp precision loss in JavaScript**. `Number` (IEEE 754 double) has 53 bits of integer precision, which handles millisecond-epoch timestamps until ~2255 AD — but if the TSDB uses **microsecond or nanosecond** precision (as InfluxDB and QuestDB do), values above 2^53 silently lose low-order bits. This causes points to "snap" to the wrong microsecond, produces duplicate-looking timestamps, and breaks sort-order assumptions. The fix is to transport high-precision timestamps as strings or BigInt and convert to millisecond precision only at the rendering layer. The retention visualizer is especially exposed because it compares timestamps across tiers — if raw and downsampled tiers use different precisions, bucket boundaries will misalign and show phantom gaps.

Finally, **downsampled charts mislead operators when the aggregation method is wrong for the metric type**. Averaging a counter metric (like total_requests) produces meaningless numbers — counters need `max` or `last` aggregation plus derivative computation to show rate. Gauge metrics (like cpu_percent) use `avg/min/max`. The ingestion monitor must distinguish between these when displaying throughput (a rate derived from a monotonic counter) versus queue depth (a gauge). Applying the wrong aggregation to a retention tier makes compacted data appear to show phantom drops or spikes that never occurred in the raw data, leading operators to chase non-existent incidents.
