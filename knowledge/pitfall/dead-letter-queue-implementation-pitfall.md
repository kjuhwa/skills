---
name: dead-letter-queue-implementation-pitfall
description: Common failure modes when building DLQ dashboards — retry semantics, counter drift, payload exposure, and heatmap misinterpretation.
category: pitfall
tags:
  - dead
  - auto-loop
---

# dead-letter-queue-implementation-pitfall

The most dangerous pitfall in DLQ visualization is **incorrect retry accounting**. In the flow visualizer, `retryAll()` resets `stats.dlq` to zero and increments `stats.retried` by the old count, then re-spawns particles with `retry: true` to skip the failure branch. In production, this creates a false-positive: the dashboard shows zero DLQ messages and a rising retry count, but the retried messages may fail again and re-enter the DLQ. If the code doesn't re-check failure conditions on retry (as the visualizer intentionally skips them), operators get a misleadingly optimistic view. A real implementation must track retry-then-fail as a distinct state, apply exponential backoff, and cap maximum retries — otherwise "Retry All" becomes an infinite loop that floods the consumer while the dashboard shows progress.

A second pitfall is **counter drift between views**. The flow visualizer maintains an in-memory `stats` object, the autopsy table derives counts from its `data` array length, and the heatmap uses a separate 2D grid. In a real system, these three data sources can disagree: the flow counter says 50 messages entered the DLQ, the table shows 48 rows (because two were purged), and the heatmap shows 53 (because it buckets by hour and a message that failed at 23:59 might round into the next bucket). Without a single source of truth — typically a DLQ topic offset or database sequence — operators will distrust the dashboard entirely. The purge operation in the autopsy table (`purgeSelected`) deletes rows from the local array but has no mechanism to propagate that deletion to the heatmap grid or the flow stats, so the views diverge immediately after any manual intervention.

A third pitfall is **payload exposure in the detail modal**. The autopsy table's `showDetail()` dumps the entire record as `JSON.stringify(r, null, 2)` into a `<pre>` tag. In production DLQ messages, payloads frequently contain PII (email addresses, payment details, session tokens). Displaying raw JSON without field-level redaction violates data-handling policies and potentially regulations like GDPR. Additionally, the `onclick="app.showDetail('${r.id}')"` pattern injects the ID into an inline handler via string interpolation — if a malicious message ID contains a quote character, this becomes an XSS vector. Production DLQ UIs must sanitize IDs, redact sensitive payload fields, and use event delegation rather than inline handlers.
