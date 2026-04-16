---
name: event-sourcing-implementation-pitfall
description: Common implementation mistakes in event-sourcing systems: mutable state leaks, missing version guards, reducer gaps, and projection consistency traps.
category: pitfall
tags:
  - event
  - auto-loop
---

# event-sourcing-implementation-pitfall

**Mutable state contamination during fold.** The most frequent pitfall is mutating the accumulator inside the reducer instead of returning a new object. All three apps use spread syntax (`{ ...state }` or `{ ...s, items: [...s.items, e.data] }`) to produce immutable snapshots, but a single direct mutation (e.g., `s.items.push(item)` instead of `[...s.items, item]`) silently corrupts time-travel: the slider will appear to work but prior snapshots will reflect future state because they share object references. This bug is invisible until you scrub backward and see data that shouldn't exist yet. The fix is enforcing immutable returns in every reducer branch, and the aggregate inspector's time-travel slider is actually the best smoke test — if scrubbing backward ever shows data from a later version, a mutation leak exists.

**Missing reducer branches and silent state loss.** When the reducer's `if`-chain doesn't cover a newly introduced event type, the default `return s` silently drops the event. The system appears healthy because no error is thrown, but the materialized state diverges from the event log. This is especially dangerous in CQRS setups where projections may handle the event correctly while the aggregate reducer ignores it, creating a silent split-brain between the write model and read models. Every reducer should have an explicit unknown-event handler that at minimum logs a warning, and integration tests should assert that the set of event types the reducer handles matches the set of types the command side can emit.

**Projection fan-out ordering and "eventual" traps.** The flow visualizer demonstrates that projections receive events with deliberate stagger (80ms, 160ms offsets), simulating real-world async delivery. A common pitfall is writing projection logic that assumes all read models are consistent at any given moment — for example, querying Read Model A immediately after writing to the event store and expecting it to reflect the latest event. In production this manifests as race conditions in API responses that join data from multiple projections. The staggered animation is a visual reminder: projections are *eventually* consistent, and any cross-projection query must either accept staleness, use a correlation watermark, or wait for all projections to confirm they've processed up to the same event version.
