---
version: 0.1.0-draft
name: powersync-backend-minimal-indexes
description: For PowerSync-backed Postgres, the backend schema is intentionally **minimal**:
type: knowledge
category: decision
confidence: high
source: thunderbolt/docs/composite-primary-keys-and-default-data.md
source_type: extracted-from-git
source_url: https://github.com/thunderbird/thunderbolt.git
source_ref: main
source_commit: 9d9c18ba511decfd3b45fc0f72c265d83355fe95
source_project: thunderbolt
imported_at: 2026-04-18T00:00:00Z
linked_skills: [powersync-add-synced-table-two-pr-flow, powersync-composite-primary-key-seed]
tags: [powersync, postgresql, indexing, e2e-encryption, architecture]
---

# Backend PowerSync schema: only primary keys + user_id index

For PowerSync-backed Postgres, the backend schema is intentionally **minimal**:

- Primary keys (required)
- A single `user_id` index on every synced table (required — sync rules filter by `user_id`)
- **No** composite foreign-key constraints
- **No** active indexes like `WHERE deleted_at IS NULL`
- **No** indexes on foreign-key columns

## Why

1. The backend is a sync server, not a query engine. Complex queries and JOINs happen on the client's local SQLite database.
2. With end-to-end encryption, indexes on encrypted columns are useless — you can't filter or search ciphertext.
3. Extra indexes add write overhead on every INSERT/UPDATE/DELETE during sync, which happens constantly.
4. Keeps ON CONFLICT handling simple for composite-PK "default data" tables (see linked skill).

## The one exception

`user_id` is indexed on every table. PowerSync sync rules like `SELECT * FROM tasks WHERE tasks.user_id = bucket.user_id` run constantly, and without the index they degrade to full-table scans.

## Implications for new tables

When adding a PowerSync-synced table:

- Do add `index('idx_<table>_user_id').on(table.userId)`.
- Do use composite primary keys `(id, user_id)` or `(key, user_id)` for tables seeded with default data.
- Don't add `.references()` to other PowerSync tables. Use plain column-level references (`text('mode_id')`).
- Don't add "active-row" indexes or foreign-key indexes. Let the frontend SQLite do the heavy querying.

## Counter / caveats

- If you ever introduce non-sync, server-side query endpoints (admin, analytics) against the same Postgres, you may need ad-hoc indexes. Colocating them in a separate schema or migration makes the intent visible and avoids polluting the sync-oriented schema.
- Before E2E encryption is enabled account-wide, some indexes would be useful for debugging; the team chose to keep them off anyway to avoid regressing later.

## Evidence

- `docs/composite-primary-keys-and-default-data.md:56-99`
- `docs/powersync-account-devices.md:36-72`
