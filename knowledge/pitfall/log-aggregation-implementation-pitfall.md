---
name: log-aggregation-implementation-pitfall
description: Common failure modes in browser-based log aggregation dashboards — unbounded buffers, misleading color scales, and timer drift.
category: pitfall
tags:
  - log
  - auto-loop
---

# log-aggregation-implementation-pitfall

The most dangerous pitfall is **unbounded memory growth**. All three apps cap their log buffers (500 entries for the stream, 200 DOM nodes in the panel, 60 columns in the waterfall), but these caps are enforced by `Array.shift()` and `removeChild(firstChild)` inside tight intervals. If the generation rate exceeds the render rate—easy when a tab is backgrounded and `setInterval` is throttled to 1Hz by the browser—the buffer trim never catches up, the DOM panel accumulates thousands of nodes, and the page freezes. The fix is to decouple ingestion from rendering: push logs into a ring buffer sized to a hard byte/count cap, and have the renderer drain only what it can paint per frame via `requestAnimationFrame`, discarding overflow silently rather than queuing it.

A subtler problem is **misleading color scales on low-volume data**. The heatmap normalizes cell color against `Math.max(...data.flat().map(d => d.total))`. If one service spikes, every other cell looks green even if their absolute error count is concerning. The topology ring uses fixed threshold bands (>20 errors = red) which avoids relative distortion but breaks when the absolute scale changes—20 errors in 10 minutes is critical, 20 errors in 24 hours is nominal. Neither approach is wrong alone, but mixing relative and absolute severity signals in a single dashboard confuses operators. The mitigation is to let users toggle between "relative to max" and "relative to SLA threshold" normalization, and always show the raw count alongside the color.

Finally, **timer drift between multiple `setInterval` calls** causes visual tearing. The waterfall uses three independent intervals (300ms log gen, 1000ms column shift, 200ms repaint). Over minutes, the column shift and the log-gen accumulator de-sync: a column might shift before any logs land in it, producing blank stripes, or two shifts might batch together, doubling a bar. Consolidating into a single `requestAnimationFrame` loop with elapsed-time accumulators eliminates drift and also lets the browser coalesce layout/paint work, reducing CPU usage by 30–50% on sustained streams.
