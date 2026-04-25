# Adding a PowerSync-synced table (two-PR flow)

PowerSync sync rules live in three places that all must agree: backend Postgres schema, the `config.yaml` under `powersync-service/config/`, and the PowerSync Cloud dashboard. If any of them drifts, sync silently stops working for that table.

The process that Thunderbolt settled on is a hard two-PR split:

## PR 1 — backend + sync rules, no frontend

- Backend Drizzle schema gets the table, with only a `user_id` index.
- `bun db generate` creates the migration. Verify `backend/drizzle/meta/_journal.json` has the new entry — Drizzle reads the journal, not the filesystem, so a missing entry silently skips the migration.
- `shared/powersync-tables.ts` adds the name + query keys so both frontend and backend agree on the set of tables that are synced.
- `powersync-service/config/config.yaml` gets the sync rule: `- SELECT * FROM my_table WHERE my_table.user_id = bucket.user_id`.
- Merge, deploy, run the migration, **then** update the dashboard rules.

## PR 2 — frontend + feature

- Frontend SQLite schema in `src/db/tables.ts`.
- `src/db/powersync/schema.ts` `drizzleSchema` registration.
- DAL + UI + any feature code.
- Merge only after PR 1 is deployed *and* dashboard rules are live.

## Why the split

If the frontend ships first, clients try to sync a table that PowerSync Cloud doesn't yet know about. Sync fails silently — no 4xx, no error event — and rows appear only locally. You don't notice until a user opens the app on a second device.

## Common mistakes

- Forgetting the `_journal.json` entry after cherry-picking a migration file. Re-run `bun db generate` on the destination branch.
- Adding composite foreign-key constraints to the backend schema (don't — see linked knowledge).
- Skipping the dashboard update between PR 1 and PR 2.

## Evidence

- `CLAUDE.md:82-93`
- `docs/powersync-account-devices.md:51-72`
