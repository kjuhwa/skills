---
version: 0.1.0-draft
name: log-aggregation-implementation-pitfall
description: Common failure modes when building log aggregation visualizations: memory blowup, scroll jank, and meaningless heatmaps
category: pitfall
tags:
  - log
  - auto-loop
---

# log-aggregation-implementation-pitfall

The most common pitfall is **unbounded accumulation**: naively pushing every incoming log into a React state array or Vue ref causes memory to balloon past 50k entries, triggering GC pauses that freeze the UI. Always cap with a ring buffer (FIFO eviction at a hard limit like 20k-50k entries) and render only the visible window via virtualization (react-window, TanStack Virtual). A related trap is **re-rendering the full stream on every tick** — each new log should append to a stable list, not trigger a full re-sort or re-filter; memoize filtered views and only recompute when filter state changes, not when the underlying list grows.

The second major pitfall is **linear-scale heatmaps**. Error counts in production logs are power-law distributed — a single incident produces 10,000 errors while baseline is 10/minute. A linear color scale makes the incident cell pure red and every other cell indistinguishable white, hiding all structure. Use `log(1+count)` or quantile-binned scales, and clip the top 1% to prevent a single outlier from compressing the entire palette. Third, **stream river tail-follow** without a pause-on-interaction mechanism makes the UI unusable: operators try to click a log line, it scrolls away, they click the wrong one. Pause auto-scroll whenever the user scrolls up, hovers, or has text selected, and surface a visible "N new logs — resume" button rather than silently resuming. Finally, do not drop the source/host lane dimension in the heatmap to "save space" — an aggregate heatmap of `time × level` loses the ability to spot a single misbehaving host, which is the primary diagnostic use case.
