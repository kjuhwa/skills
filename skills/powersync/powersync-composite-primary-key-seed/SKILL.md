---
name: powersync-composite-primary-key-seed
description: Design default-data tables (settings, models, modes, tasks) so each user can hold the same default IDs by using composite primary keys (id, user_id) or (key, user_id) on the backend and reconciling with a default-hash column on the frontend.
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
tags: [powersync, postgresql, drizzle, default-data, seeding]
linked_knowledge: [powersync-backend-minimal-indexes]
---

## When to use

You have tables seeded at app initialization with shared default IDs (e.g. `openai-gpt-4o`, `theme`, `inbox`). In a PowerSync world, two users can both legitimately own a row with the same default ID, so a single-column primary key on the backend collides.

## Steps

1. On the **backend** (Postgres), declare the table with a composite primary key. For id-based tables use `(id, user_id)`, for settings-style tables use `(key, user_id)`.
2. Update `powersyncConflictTarget` in `backend/src/db/powersync-schema.ts` to include both columns so `INSERT ... ON CONFLICT (id, user_id)` / `ON CONFLICT (key, user_id)` upserts per user.
3. Update `powersyncPkColumn` for the table so PATCH/DELETE use the "business" id column (not `user_id`) in their `WHERE` clauses. Always AND the clause with `user_id` from the JWT so users can only mutate their own rows.
4. Do **not** add `.references()` to this table from other tables. Use a plain column like `modeId: text('mode_id')`. PowerSync treats the server as a sync target, not a query engine, so FKs add overhead and block valid partial-sync states.
5. On the **frontend** (SQLite), keep a single-column PK (`id` or `key`). Local data is already scoped to one user.
6. Add a `default_hash` column to detect user modifications. At startup, `reconcileDefaultsForTable()` inserts new defaults, back-fills `default_hash` on rows that lack it, and updates only when the *previous* default hash matches the stored hash (i.e. the user has not edited).
7. Guard against wiping user-set values with null defaults: if `existing.value !== null` and `defaultItem.value === null`, skip the update. This protects fields like locale/units that users set via other code paths.

## Counter / Caveats

- Hash equality is the only modification signal. Any column not fed into the hash function effectively becomes unmanageable by `reconcileDefaults`; include every field you want to keep in sync.
- The approach assumes an idempotent `uuidv7()` seed per device for an anonymous-id setting. If you add other per-user unique seeds, create them in the same transaction as reconcile so they survive the reset-and-reseed flow atomically.
- Do not rely on composite PKs on the frontend — it confuses Drizzle tooling and PowerSync upload builds the `WHERE` clause from a single business key plus user_id on the server.

## Evidence

- `docs/composite-primary-keys-and-default-data.md:7-53`
- `src/lib/reconcile-defaults.ts:22-101` — the reconcile implementation with hash guard
- `src/db/tables.ts` / `backend/src/db/powersync-schema.ts` — composite PK declarations
