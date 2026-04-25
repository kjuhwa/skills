---
name: powersync-no-foreign-keys-on-sync-backend
description: Skip composite foreign-key constraints on a PowerSync-style backend schema and use plain text columns for cross-table references, so partial syncs don't fail and encrypted columns don't block writes.
category: powersync
confidence: medium
version: 1.0.0
version_origin: extracted
source_type: extracted-from-git
source_url: https://github.com/thunderbird/thunderbolt.git
source_ref: main
source_commit: 9d9c18ba511decfd3b45fc0f72c265d83355fe95
source_project: thunderbolt
imported_at: 2026-04-18T00:00:00Z
tags: [powersync, postgresql, drizzle, foreign-keys, sync]
linked_knowledge: [powersync-backend-minimal-indexes]
---

## When to use

You are modelling PowerSync-synced Postgres tables where some parent tables have composite primary keys like `(id, user_id)`. The natural instinct is to add a matching composite foreign key from children. Don't.

## Steps

1. Declare the child column as a plain text column: `modeId: text('mode_id')`. No `.references()`, no `foreignKey()`.
2. Enforce relationships on the **frontend** — SQLite queries already JOIN there, and that's where business logic lives in a PowerSync app.
3. Skip indexes on the foreign-key column. Only `user_id` gets an index on the backend.
4. For default-data tables that ship with predefined IDs, expect children to temporarily point at a default parent ID that isn't yet synced on a brand-new device; the reconcile-defaults step will populate it.
5. Validate referential integrity at the application layer (DAL or service), not the database.

## Counter / Caveats

- Confidence is `medium` because this inverts the default relational-DB advice; teams coming from a traditional stack often push back. Document the decision prominently in `AGENTS.md` or a schema comment.
- You lose cascade-delete at the database level. If you rely on ON DELETE CASCADE, you must replicate it in the DAL or accept orphaned rows (which PowerSync tolerates by design during partial syncs).
- If the backend gains non-sync query endpoints (admin, analytics) in the future, add FKs per-endpoint in a separate schema rather than the shared PowerSync schema.

## Evidence

- `docs/composite-primary-keys-and-default-data.md:56-99`
- Example callouts: `chatThreadsTable.modeId references modesTable without foreignKey()`
