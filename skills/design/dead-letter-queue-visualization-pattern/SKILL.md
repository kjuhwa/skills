---
name: dead-letter-queue-visualization-pattern
description: Visual patterns for rendering DLQ message flow, inspection tables, and failure heatmaps in dark-themed operational dashboards.
category: design
triggers:
  - dead letter queue visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# dead-letter-queue-visualization-pattern

DLQ visualization decomposes into three complementary views that together give operators full situational awareness. The **flow view** uses a canvas with particle animation between labeled nodes (Producer → Consumer → Done / DLQ). Each message is a particle whose color encodes success (#6ee7b7 green) or failure (#f87171 red), and routing is decided at the Consumer node based on a failure probability. A persistent stats bar (processed / failed / in-DLQ / retried) updates every animation frame, giving real-time throughput feedback. Controls for "Send Burst," "Retry All DLQ," and "Pause/Resume" let operators simulate load and replay scenarios. The key reusable structure is: define zone objects with {x, y, label, color}, spawn particles with a phase-state machine (to-consumer → to-done | to-dlq), and advance via requestAnimationFrame with linear interpolation toward the target zone.

The **autopsy table** view renders DLQ entries in a sticky-header table with columns for ID, topic, error class, severity, retry count, timestamp, and a payload-inspect button. Filtering is dual-axis: a free-text search across error/topic and a severity dropdown (critical/warning/info). Severity cells are color-coded via CSS classes (sev-critical red, sev-warning amber, sev-info blue). Bulk operations (select-all checkbox, purge selected, retry selected) operate on checked rows. Payload detail opens in a fixed-position modal overlay with JSON pretty-print. This pattern is reusable for any DLQ inspection UI: generate rows from a data array, re-render on filter change, and expose batch actions that mutate the backing array then re-filter.

The **heatmap monitor** uses an SVG grid where rows are Kafka topics and columns are hour-of-day buckets. Cell fill color interpolates from a dark base (#0f2922) to bright green (#6ee7b7) proportional to failure count, using a linear RGB ramp capped at 10+. A mousemove tooltip shows "topic @ HH:00 → N failures." A setInterval (2 s) randomly increments or decrements cells to simulate live telemetry drift. The reusable pattern is: build an SVG string from a 2D numeric grid, attach event delegation on `rect` elements via data attributes (data-r, data-c, data-v), and periodically mutate the grid then rebuild. All three views share a dark theme (#0f1117 background, #6ee7b7 accent, #c9d1d9 text) and a zero-dependency, single-file architecture.
