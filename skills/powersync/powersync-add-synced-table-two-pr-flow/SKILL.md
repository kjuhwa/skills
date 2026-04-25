---
name: powersync-add-synced-table-two-pr-flow
description: Add a new PowerSync-synced table across frontend SQLite, backend Postgres, shared table registry, and sync-rules YAML using a strict two-PR process so the frontend never ships before the PowerSync Cloud dashboard rules exist.
category: powersync
confidence: high
version: 1.0.0
version_origin: extracted
source_type: extracted-from-git
source_url: https://github.com/thunderbird/thunderbolt.git
source_ref: main
source_commit: 9d9c18ba511decfd3b45fc0f72c265d83355fe95
source_project: thunderbolt
imported_at: 2026-04-18T00:00:00Z
tags: [powersync, postgresql, drizzle, deployment, sync-rules]
linked_knowledge: [powersync-backend-minimal-indexes, powersync-deploy-order-two-pr-invariant]
---

## When to use

You are adding a brand-new PowerSync-synced table to an app where the backend schema, shared table registry, sync-rules YAML, and frontend schema all have to stay in lock-step with PowerSync Cloud's dashboard rules.

## Steps

**PR 1 — backend only**

1. Add the table to the backend Drizzle schema file (e.g. `backend/src/db/powersync-schema.ts`). Include a `user_id` column and exactly one index: `index('idx_<table>_user_id').on(table.userId)`.
2. Generate and register the Drizzle migration with `bun db generate`. Verify the new entry appears in `backend/drizzle/meta/_journal.json` — Drizzle discovers pending migrations through the journal, not the file system, so a missing entry means the migration will never run.
3. Update `shared/powersync-tables.ts`: add the table name to `POWERSYNC_TABLE_NAMES` and wire its React Query keys in `powersyncTableToQueryKeys`.
4. Add a sync rule line under `bucket_definitions.user_data.data` in `powersync-service/config/config.yaml`: `- SELECT * FROM <table> WHERE <table>.user_id = bucket.user_id`.
5. For default-data tables, use a composite PK `(id, user_id)` or `(key, user_id)` and update `powersyncConflictTarget` in the backend schema.
6. Merge PR 1. Run the migration in production. **Then** update sync rules in the PowerSync Cloud dashboard so they match `config.yaml`.

**PR 2 — frontend + feature code**

7. Add the table to `src/db/tables.ts` (frontend SQLite schema). Single-column `id` or `key` is fine — the frontend is per-user, so composite PKs are not needed locally.
8. Register the table in `src/db/powersync/schema.ts` (`drizzleSchema`).
9. Add any UI, DAL, and feature logic.
10. Merge PR 2 only after PR 1 is fully deployed *and* PowerSync Cloud dashboard rules are live.

## Counter / Caveats

- Shipping PR 2 before the dashboard rules are updated causes silent sync failure: the table works locally but nothing replicates across devices, and there is no error surface.
- Do not add composite foreign keys or secondary indexes to the backend schema — see the linked `powersync-backend-minimal-indexes` knowledge for rationale.
- Cherry-picking migration SQL across branches without the matching `_journal.json` entry is a common failure mode; re-run `bun db generate` after cherry-picks.

## Evidence

- `CLAUDE.md:82-93` — deploying new synced tables (two-PR process) and journal warning
- `docs/powersync-account-devices.md:51-72` — full adding-a-new-table steps
- `powersync-service/config/config.yaml` — sync rule format
