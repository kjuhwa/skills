---
name: cdc-visualization-pattern
description: Visual layout patterns for rendering CDC streams, replay timelines, and conflict resolution views
category: design
triggers:
  - cdc visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# cdc-visualization-pattern

Change Data Capture (CDC) UIs share three recurring visualization surfaces that can be composed per app. The **stream monitor view** renders a left-to-right flowing lane per source table with row-level change cards (INSERT/UPDATE/DELETE) color-coded green/amber/red, a log-sequence-number (LSN) or binlog-offset axis at the top, and a lag gauge per consumer. Pair it with a sticky "current LSN" ruler so operators can correlate spikes to schema or load events. The **replay timeline view** uses a horizontal scrubber over the WAL/binlog offset range with bookmarks for DDL events, transaction boundaries (BEGIN/COMMIT markers as vertical bars), and a playback head that can step forward/backward by txn. Render transactions as grouped bands so multi-row atomic changes stay visually atomic during scrubbing.

The **conflict resolver view** is a three-pane diff: source row | target row | merged result, with field-level highlighting for divergent columns and a resolution strategy selector (source-wins / target-wins / latest-timestamp / custom-merge) per column. Always show the originating LSN + timestamp + transaction id on both sides because CDC conflicts are almost always caused by clock skew or out-of-order delivery, and operators need those coordinates to reason about causality.

Across all three views, keep a shared top-bar showing **source → target topology**, current replication lag (seconds and bytes), and a kill-switch for pause/resume. Reuse the same color semantics (green=applied, amber=pending, red=failed/conflict, gray=skipped) and the same LSN formatting (hex with thousands separators) so operators can move between monitor, replay, and resolver without re-learning the visual language.
