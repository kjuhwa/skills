---
name: cdc-implementation-pitfall
description: Common pitfalls in CDC visualization and simulation: snapshot drift, ID collisions, unbounded DOM growth, and missing operation-type edge cases.
category: pitfall
tags:
  - cdc
  - auto-loop
---

# cdc-implementation-pitfall

The most insidious pitfall in CDC table diff implementations is **snapshot reference sharing**. If the before/after snapshots are not deep-cloned at capture time, JavaScript's object references mean the "before" state silently mutates when you modify the "after" state, producing diffs that show zero changes. The table-diff app addresses this with `JSON.parse(JSON.stringify(rows))` on both sides of the mutation, but this breaks on `undefined` values, `Date` objects, and circular references — all of which appear in real CDC payloads from databases with timestamp columns or self-referential foreign keys. A production implementation should use `structuredClone()` or a schema-aware cloner that preserves column types.

Another pitfall is **unbounded DOM/memory growth**. The stream monitor caps its event log at 50 children and the particle array naturally drains as particles exit the viewport, but neither has a hard memory ceiling. In a real CDC dashboard receiving thousands of events per second, the particle array, event history, and timeline dots would grow without bound, eventually causing GC pauses and frame drops. The topology map avoids this by having no event accumulation, but it re-renders the entire SVG innerHTML on every resize, which destroys and recreates all `<animateMotion>` elements — causing visible animation restarts. A production topology should diff-update the DOM or use a retained-mode rendering library.

A subtler domain-specific pitfall is **DELETE simulation against shrinking datasets**. The table-diff app guards against deleting the last row (`rows.length > 1`), but it doesn't handle the CDC concept of tombstone events or the scenario where a DELETE is followed by an INSERT of the same primary key (which in real CDC systems like Debezium produces distinct events that must not be collapsed). The uniform random distribution of INSERT/UPDATE/DELETE also doesn't reflect real-world CDC traffic, where updates typically dominate (60–80%) and deletes are rare (<5%). Simulations with equal probability create misleading performance impressions and can mask rendering bugs that only surface under realistic operation-type ratios.
