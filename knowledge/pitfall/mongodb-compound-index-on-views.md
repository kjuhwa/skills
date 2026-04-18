---
version: 0.1.0-draft
tags: [pitfall, mongodb, compound, index, views]
name: mongodb-compound-index-on-views
description: Spring Data @CompoundIndex annotations on a view-backed @Document class are silently ignored — the annotation must live on the collection-backed class or the collection stays unindexed.
type: pitfall
category: pitfall
source:
  kind: project
  ref: lucida-domain-apm@11c3887f
confidence: high
---

**Fact.** `@CompoundIndex` (and `@Indexed`) on a Spring Data MongoDB `@Document` mapped to a *view* produce no indexes. Views don't carry indexes — they inherit from the underlying collection. Spring's index auto-creation walks `@Document` beans and calls `createIndex` on the named target; on a view, the call is effectively a no-op, so the backing collection stays on COLLSCAN.

**Why.** Teams refactoring a hot collection into a "collection + materialized view" split often move the `@Document` → view and keep the index annotations on it, expecting Spring to pick them up. It doesn't. Symptoms: slow queries despite "indexes declared in code", and `db.<view>.getIndexes()` returning empty. In lucida-domain-apm, commits `#118202` tracked a real incident where indexes on `Trace.java` (used as a view) were moved to `TraceView.java` and then ultimately re-landed on the collection entity to restore index creation.

**How to apply.**
- Keep `@CompoundIndex` on the **collection-backed** `@Document` class.
- After deploy, verify via `db.<collection>.getIndexes()` — do not trust `db.<view>.getIndexes()`.
- If the codebase has both a collection class and a view class, put index annotations only on the collection; the view reads through them.
- Add an integration test that asserts index count after context startup.

**Counter / Caveats.** Spring Boot 3+ disables auto-index-creation by default (`spring.data.mongodb.auto-index-creation=false`). Even on the correct class, indexes won't appear unless that flag is enabled or you create indexes explicitly via `IndexOperations`. Materialized views (on-demand vs refreshed) behave differently from standard views; verify against the MongoDB version you run.
