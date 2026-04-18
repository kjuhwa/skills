---
version: 0.1.0-draft
name: cqrs-implementation-pitfall
description: Treating CQRS as "just split read/write DBs" and ignoring projector idempotency, ordering, and rebuild cost.
category: pitfall
tags:
  - cqrs
  - auto-loop
---

# cqrs-implementation-pitfall

The most common CQRS failure is adopting separate read and write stores without engineering the projection layer as a first-class system. Teams assume events will "just be applied" and discover too late that projectors must be idempotent (events can be redelivered), ordering-aware (out-of-order events corrupt derived state), and resumable from a durable checkpoint. A projector that stores no offset cannot recover from a crash without a full replay, and a full replay against a multi-year event log can take hours — during which the read model is stale or unavailable.

A second pitfall is leaking write-side concerns into queries, or vice versa: running aggregate validation against the read model (which is eventually consistent, so the check is unsound), or letting queries trigger writes to "refresh" a projection. Either pattern collapses the separation CQRS exists to provide. The fix is strict: commands mutate only the write model, queries read only from projections, and staleness is either tolerated or addressed with a read-your-writes token returned by the command API.

The third trap is snapshot neglect in event-sourced variants. Without periodic snapshots, aggregate hydration cost grows linearly with history, and rebuild time for new projections becomes prohibitive. Snapshots must be versioned alongside event schemas, because an event payload migration invalidates every snapshot taken under the old shape — teams that forget this ship a "fast" rebuild that silently reconstructs state from a schema that no longer matches the code.
