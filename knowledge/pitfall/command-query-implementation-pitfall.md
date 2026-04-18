---
version: 0.1.0-draft
name: command-query-implementation-pitfall
description: Common traps when building CQRS command-query separation apps — leaky reads, sync assumptions, and unbounded projections
category: pitfall
tags:
  - command
  - auto-loop
---

# command-query-implementation-pitfall

The most frequent mistake is letting the query side read directly from the write-side aggregate store "just this once" for freshness. This silently collapses CQRS back into CRUD and hides the lag the whole exercise is meant to expose. Enforce the separation at the type level — command handlers must not return query DTOs, and query handlers must not accept aggregate repositories as dependencies. If a UI screen "needs" immediate consistency, the correct fix is an explicit synchronous projection for that view, not a sneaky read-through, and the simulator should visibly mark that view as "sync-projected" so learners see the tradeoff.

A second trap is assuming command success means the read model is updated. Tests and demos that call a command then immediately query will pass locally (because the projector ran in the same tick) and fail under any real async transport. Always inject an artificial minimum projection lag (even 50ms) in dev and simulation modes, and have the UI poll or subscribe rather than assume. Returning a "projected-as-of-version" token from the command response, which the client then waits on before querying, is the clean pattern — demonstrate it explicitly in at least one of the three apps.

Finally, projections grow unboundedly if you replay the full event log on every restart and never snapshot. In a long-running simulator this manifests as progressively slower "reset" or "scrub-to-start" operations. Build snapshotting in from day one: every N events, persist the read-model state plus the event version it reflects, and replay only the tail on reload. Equally, guard against projector poison events — one malformed event should quarantine to a dead-letter view, not halt all projections, or the entire query side goes dark from a single bad command.
