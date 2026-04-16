---
name: etl-implementation-pitfall
description: Common failure modes when building ETL visualizer/playground apps in the browser
category: pitfall
tags:
  - etl
  - auto-loop
---

# etl-implementation-pitfall

The biggest pitfall is animating per-record: at 500 rec/sec with individual DOM nodes per packet, the browser hits 16ms frame budget within ~5 seconds of playback and the visualization stutters. Batch records into visual "waves" (10-50 per animated dot) and use Canvas or SVG transforms with `will-change: transform` rather than per-element React re-renders. A related trap is running the data generator on the main thread—move it to a Web Worker so transform-heavy demos don't starve the render loop when users crank the defect-rate sliders.

The second class of failure is quality-score math that lies. Completeness is easy (non-null ratio) but validity, consistency, and uniqueness require windowed computation, and naive implementations recompute over the entire history each tick—O(n²) in record count. Use incremental aggregators (HyperLogLog for uniqueness estimates, rolling counters for validity rule hits) keyed on a sliding time window. Finally, don't conflate transformation rules with quality rules in the UI: transform rules *change* data (map/filter), quality rules *judge* data (score/flag). Mixing them confuses users into thinking a failing quality check will auto-repair the record, which it won't unless there's an explicit cleansing step wired between them.
