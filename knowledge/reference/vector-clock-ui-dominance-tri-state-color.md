---
version: 0.1.0-draft
name: vector-clock-ui-dominance-tri-state-color
description: Render vector-clock comparisons as a three-state (before/after/concurrent) badge, never a boolean.
category: reference
tags:
  - causal
  - auto-loop
---

# vector-clock-ui-dominance-tri-state-color

A recurring bug across all three builds was treating `compare(vcA, vcB)` as `<`/`>`/`=` and forgetting the fourth case: **concurrent** (neither dominates). UIs that use a two-color diff (red/green) silently mis-paint concurrent events as "equal" or "older," hiding exactly the conflicts the visualizer exists to show. Standardize on a tri-state enum `{BEFORE, AFTER, CONCURRENT, EQUAL}` at the comparator boundary and force every consumer — badges, arrows, tooltips, filters — to handle `CONCURRENT` explicitly with a distinct color (amber/diagonal hatch worked well) rather than falling through to a default.

**Why:** The whole point of vector clocks vs scalar timestamps is detecting concurrency; a UI that collapses it to ordering defeats the demo. **How to apply:** wherever you expose a partial order (vector clocks, version vectors, dotted version vectors, CRDT causal contexts), the comparator's return type must be a 4-valued enum, not `-1/0/1`, and the renderer must have a dedicated visual for the concurrent case before any ordering feature ships.
