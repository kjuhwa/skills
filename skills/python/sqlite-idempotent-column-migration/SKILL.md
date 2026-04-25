---
name: sqlite-idempotent-column-migration
description: Apply SQLite column-level schema migrations at every startup without Alembic, using existence checks plus table-rename for column removal.
category: python
version: 1.0.0
version_origin: extracted
tags: [sqlite, migrations, sqlalchemy, desktop-apps, idempotent]
source_type: extracted-from-git
source_url: https://github.com/jamiepine/voicebox.git
source_ref: main
source_commit: 476abe07fc2c1587f4b3e3916134018ebacd143d
source_project: voicebox
confidence: high
imported_at: 2026-04-18T00:00:00Z
---

# SQLite idempotent column migration

## When to use
You ship a single-user desktop or CLI app with a SQLite database. Every user has exactly one DB file. Alembic's rollback/team-coordination features don't apply and its `alembic.ini + env.py + versions/` tree is annoying to bundle through PyInstaller.

## Steps
1. Write one `run_migrations(engine)` function called from app startup. Its job is idempotent: run on every launch, do nothing when the schema already matches.
2. Inside, introspect current schema with SQLAlchemy's inspector: `tables = set(inspector.get_table_names())`, `columns = {c["name"] for c in inspector.get_columns(table)}`. Don't trust ORM metadata — read the live DB.
3. For "add column" migrations: `if "new_col" not in columns: ALTER TABLE t ADD COLUMN new_col TYPE DEFAULT ...`. Use `_add_column(engine, table, "new_col TYPE DEFAULT x", "label")` helper that logs when it fires.
4. For "remove column" (SQLite can't DROP COLUMN on old versions): create `t_new`, `INSERT INTO t_new SELECT ...` with the reduced column set, `DROP TABLE t`, `ALTER TABLE t_new RENAME TO t`. Wrap in a single transaction. Re-read `columns` after the recreate because the inspector's cache is stale.
5. For "change data shape" migrations (e.g. replace a `position` int with absolute `start_time_ms`): add the new column, populate it in a single pass over the old data, then remove the old column via rename.
6. Order migrations deterministically by splitting per-table: `_migrate_story_items`, `_migrate_profiles`, … called in a fixed sequence from `run_migrations`. Each helper guards on table presence first.
7. After column migrations, run data normalizations (path rebasing, UUID format fixes) inside the same startup pass so users never see half-migrated rows.

## Counter / Caveats
- Log only when real work happens — a silent startup on an already-migrated DB is the happy path, but a suddenly-noisy startup after an update is useful telemetry.
- Never reorder the per-table migration calls across releases; an earlier migration may assume a later one hasn't run yet.
- Column existence checks catch the common case but not "column has wrong type" — if you need to change a column type, go through the rename-rebuild pattern.
- This approach hits its wall when you need coordinated multi-process migrations or rollback. At that point, graduate to Alembic.

Source references: `backend/database/migrations.py` (the whole file, including `_migrate_story_items` for the rename-rebuild pattern and `_normalize_storage_paths` for the data pass).
