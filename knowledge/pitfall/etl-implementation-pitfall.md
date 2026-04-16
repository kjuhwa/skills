---
name: etl-implementation-pitfall
description: Common implementation pitfalls when building ETL pipeline visualizations and monitoring dashboards, including state machine gaps, null rendering traps, and animation timing issues.
category: pitfall
tags:
  - etl
  - auto-loop
---

# etl-implementation-pitfall

The most dangerous pitfall in ETL pipeline flow visualization is incomplete state machine handling. The job monitor demonstrates four states (running, done, failed, queued) but the tick function only transitions running→done and queued→running — there is no path to recover or retry a failed job, and no mechanism for a running job to fail mid-execution. In production, this means the UI can accumulate stuck "failed" entries that never clear and "running" jobs that monotonically approach 100% but never regress, masking real-world scenarios where jobs fail at 80% progress or oscillate between retry attempts. Always model bidirectional transitions (running↔failed, failed→queued for retry) and add a staleness detector that flags jobs whose progress hasn't advanced within N ticks.

A second pitfall emerges in the data profiler's null handling. The simulation injects nulls stochastically per cell, but the profiling charts (donut, bar) and the preview table compute null counts independently — the donut calculates `total cells - null cells` across the entire dataset, while the bar chart counts nulls per column, and the table just renders per-row. If null injection logic changes, all three views must be updated or they'll disagree. The deeper issue is that null semantics differ between ETL stages: a NULL in the Extract phase means "source data missing" while a NULL after Transform might mean "intentionally filtered." Profiling UIs should tag nulls with their origin stage, not just their presence, or operators will chase phantom data quality issues that are actually intentional transformations.

Third, the pipeline flow animation uses sequential `setInterval` + `Promise` chaining with hardcoded 500ms per-box delays and 300ms inter-stage pauses. This creates a rigid 5.4-second animation regardless of actual pipeline complexity. For real ETL monitoring, animation duration should be proportional to actual processing time or row count — a 241K-row Clickstream job should visually convey more weight than a 5.6K-row CRM import. Hardcoded timing also breaks when browser tabs are backgrounded (setInterval throttling) or when stages have variable sub-step counts, causing the animation to desync from the log entries that are supposed to narrate it.
