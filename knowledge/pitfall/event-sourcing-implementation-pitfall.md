---
version: 0.1.0-draft
name: event-sourcing-implementation-pitfall
description: Schema evolution and non-deterministic projections break replay guarantees
category: pitfall
tags:
  - event
  - auto-loop
---

# event-sourcing-implementation-pitfall

The most insidious event-sourcing failure is silently changing event payload schemas without versioning. Old events in the log were serialized under v1, but the current projector deserializes as v2 — fields go missing, defaults silently fill in wrong values, and a full replay produces a different state than the live system. Always stamp every event with a `schemaVersion` and keep upcaster functions (v1→v2→v3) so old events can be transformed at read time. Never mutate historical events to "fix" them; emit a corrective event instead.

Non-deterministic projection handlers are the second trap. If a handler calls `Date.now()`, `Math.random()`, or fetches external data, replaying the same log twice yields different state — defeating the entire point of event sourcing. All side-effecting or time-dependent values must come from the event payload itself (recorded at write time). Apps like time-travel-tree expose this by replaying the same offset twice and diffing the result; any divergence is a determinism bug.

Finally, beware unbounded projection lag and snapshot strategy. Without periodic snapshots, replaying millions of events on cold start takes minutes. But snapshots taken at the wrong granularity (per-event = storage bloat; per-million = slow recovery) or without including the schemaVersion become poisoned after an upcaster change. Snapshot every N events, store the schemaVersion with the snapshot, and invalidate snapshots when any handler in the fold chain changes.
