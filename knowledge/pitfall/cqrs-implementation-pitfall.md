---
name: cqrs-implementation-pitfall
description: Common CQRS mistakes: sync projections, shared models, non-idempotent handlers, missing version checks
category: pitfall
tags:
  - cqrs
  - auto-loop
---

# cqrs-implementation-pitfall

The most frequent CQRS pitfall in demo and production code alike is **synchronous projection** — updating the read model inside the command handler's transaction. This silently reintroduces all the coupling CQRS was meant to eliminate: the write path now blocks on read-model schema changes, failures in the projector bring down writes, and the illusion of separation hides that there is really only one model. The fix is a real queue or event log between command handler and projector, even in a toy app; otherwise you are building CRUD with extra classes.

A second trap is **shared domain objects** between command and query sides. If the same `User` class is used for both writes and reads, every read-optimization (denormalized fields, precomputed aggregates) pollutes the write model's invariants, and every write-side invariant (required fields, value objects) bloats read DTOs. Keep the two type hierarchies separate from day one — `UserAggregate` on the write side, `UserView`/`UserSummary` on the read side — even when they start identical.

Third, **non-idempotent projection handlers** break under event replay and at-least-once redelivery. For event-sourced-counter, a handler that does `counter += 1` on an `Incremented` event will double-count if the event is replayed during projector restart. Always include an event version/offset in the read model and skip events whose version is ≤ the last-applied version. Related: forgetting **optimistic concurrency checks** (expected aggregate version) on the command side lets two concurrent commands both succeed against a stale aggregate and emit conflicting events that the projector cannot reconcile.
