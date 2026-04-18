---
version: 0.1.0-draft
name: distributed-tracing-implementation-pitfall
description: Clock skew, orphan spans, and sampling bias break tracing visualizations in ways that look like UI bugs
category: pitfall
tags:
  - distributed
  - auto-loop
---

# distributed-tracing-implementation-pitfall

The most frequent failure mode is treating `startTime` as an absolute wall-clock value when spans come from different hosts. Clocks drift by milliseconds to seconds across a fleet, so a naive waterfall can render a child span starting *before* its parent, which users interpret as a rendering bug. The fix is to anchor each trace to the root span's clock and express all child offsets relative to it, or detect inversions and clamp them with a visible warning badge rather than silently reordering. Never use server-side receive timestamps as a substitute — they encode network latency as span duration.

Orphan spans — children whose `parentSpanId` references a span not present in the batch — are endemic when tail sampling drops parents but keeps children, or when async work outlives the root. A robust visualization must detect orphans during the tree-build pass and either attach them to a synthetic "unknown parent" node or surface them in a separate panel. Silently dropping them hides real production behavior; silently re-rooting them at the trace root corrupts the critical path calculation. The service graph has a related trap: aggregating edges without deduplicating by `(parentSpanId, spanId)` double-counts retries as separate calls.

Sampling bias distorts the heatmap most severely. Head-based sampling (sample 1% at ingress) preserves latency distributions but loses rare errors; tail-based sampling (keep all errors + 1% of successes) inverts the distribution and makes p50 look catastrophic. Always display the sampling strategy and effective sample rate alongside any percentile — a p99 computed from 50 tail-sampled error traces is not the same statistic as a p99 from 50,000 head-sampled traces, and conflating them on the same axis is how tracing dashboards mislead on-call engineers during incidents.
