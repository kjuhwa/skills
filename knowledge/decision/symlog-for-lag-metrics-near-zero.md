---
name: symlog-for-lag-metrics-near-zero
description: Use symlog (not log) for consumer lag axes so healthy near-zero state stays visible alongside million-message spikes.
category: decision
tags:
  - lag
  - auto-loop
---

# symlog-for-lag-metrics-near-zero

Pure log scales break at zero and compress the 0–10 range into invisibility, which is exactly where a healthy consumer lives. Linear scales flatten spikes into a cliff that hides recovery dynamics. Symlog (symmetric log, linear near zero then logarithmic outside a threshold) keeps both regimes readable. Set the linear threshold to roughly the SLA budget (e.g. 100 messages) so "inside SLA" renders as a proportional band and "outside SLA" compresses gracefully.

Why: this was discovered the hard way across the three apps when linear-scale lag charts showed a dead-flat baseline punctuated by unreadable spikes, and log-scale charts vanished the baseline entirely. Symlog with threshold = SLA made both the steady-state jitter and the 10^6 outage visible in the same frame. 

How to apply: any time a metric is "usually near zero, occasionally huge" (lag, error rate, retry depth, GC pause), reach for symlog before linear or log. d3 exposes it as `d3.scaleSymlog().constant(SLA)`; plain canvas math is `y = sign(v) * log10(1 + abs(v)/c) * k`. Do not use symlog for metrics with a natural non-zero floor (throughput, CPU %) — linear is correct there.
