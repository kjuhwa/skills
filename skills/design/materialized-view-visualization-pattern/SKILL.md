---
name: materialized-view-visualization-pattern
description: Split-pane visualization showing base table mutations flowing into a derived view with staleness indicators
category: design
triggers:
  - materialized view visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# materialized-view-visualization-pattern

Materialized view UIs work best when the screen is divided into three synchronized regions: a **base-table panel** showing raw row mutations (INSERT/UPDATE/DELETE events streaming in), a **view panel** showing the derived aggregate/projection, and a **staleness delta panel** showing the diff between "what the view says" and "what the base would say right now if recomputed." Color the view rows by age-since-last-refresh (fresh=green, stale=amber, divergent=red) so users can see at a glance how far the materialization has drifted from truth.

Render the refresh operation itself as a first-class animated event, not a silent state swap. Show a sweep/progress bar across affected view rows during refresh (whether FULL, INCREMENTAL, or CONCURRENT), and briefly highlight which base-table mutations are being "absorbed" into the view on this tick. For incremental/delta refreshes, draw arrows from the source change-log entries to the view rows they update — this makes the invariant "view = f(base) at time T" visually obvious, which is the single mental model users must internalize.

Always expose the **refresh policy** (on-commit, scheduled, manual, lazy-on-read) as a visible control, and plot refresh ticks on a timeline axis alongside mutation ticks. The interesting bugs in materialized views live in the *gap* between mutation time and refresh time, so the UI must make that gap measurable and scrubable.
