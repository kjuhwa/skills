---
name: cqrs-implementation-pitfall
description: Forgetting eventual consistency in the UI creates read-your-write bugs that invalidate the whole demo
category: pitfall
tags:
  - cqrs
  - auto-loop
---

# cqrs-implementation-pitfall

The most common CQRS mistake — in both real systems and demos — is issuing a command and then immediately querying the read model expecting to see the result. The projection hasn't applied yet, so the query returns stale data, and users conclude "CQRS is broken." In a visualizer this manifests as the command animation finishing before the projection updates, while a query fired in between returns the old value. If your demo hides this by making projections synchronous, you've removed the single most important teaching moment; if you expose it without explaining it, users think it's a bug.

Handle this explicitly. Either (a) block queries on a projection-version token returned by the command (read-your-writes consistency), (b) show a "pending projection" badge on affected read models until the relevant event sequence number has been applied, or (c) render both "write-model truth" and "read-model view" side-by-side with a visible delta counter. Option (b) is usually best for demos because it teaches the mitigation pattern used in production (version tokens, causal consistency headers) without hiding the underlying lag.

A related pitfall: using the same data model for commands and queries "just to simplify the demo." This silently collapses CQRS back into CRUD and every downstream lesson — projection rebuilding, multiple read shapes, independent scaling — stops making sense. Keep the write model normalized/aggregate-shaped and force at least one read model to be visibly denormalized (e.g., pre-joined, pre-counted, pre-sorted) so the "why bother with two sides" question answers itself the moment a user looks at the schemas.
