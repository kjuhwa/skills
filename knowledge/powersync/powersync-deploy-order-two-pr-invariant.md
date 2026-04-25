---
version: 0.1.0-draft
name: powersync-deploy-order-two-pr-invariant
description: For every new PowerSync-synced table, the frontend **must not** ship before PowerSync Cloud's dashboard sync rules ma...
type: knowledge
category: decision
confidence: high
source: thunderbolt/CLAUDE.md
source_type: extracted-from-git
source_url: https://github.com/thunderbird/thunderbolt.git
source_ref: main
source_commit: 9d9c18ba511decfd3b45fc0f72c265d83355fe95
source_project: thunderbolt
imported_at: 2026-04-18T00:00:00Z
linked_skills: [powersync-add-synced-table-two-pr-flow]
tags: [powersync, deployment, sync-rules, invariants]
---

# Deploy order invariant: backend + dashboard rules before frontend

For every new PowerSync-synced table, the frontend **must not** ship before PowerSync Cloud's dashboard sync rules match the backend config. If the frontend deploys first:

- The new table replicates locally but never cross-device.
- There is no error surface — no 4xx, no exception, no console warning.
- The first user to hit a multi-device flow discovers the bug, usually after writing data that will silently not sync.

## Required order

1. Ship backend Drizzle migration + `shared/powersync-tables.ts` + `powersync-service/config/config.yaml` update.
2. Deploy the backend and run the migration.
3. Update PowerSync Cloud dashboard sync rules to match the new `config.yaml`.
4. Ship the frontend schema + feature code.

## Related invariant: journal file

Drizzle migrations are discovered through `backend/drizzle/meta/_journal.json`. When cherry-picking migration SQL across branches, always verify the journal entry was cherry-picked too. Missing journal entry = migration never runs = schema drift.

## Evidence

- `CLAUDE.md:82-93`
- `docs/powersync-account-devices.md:51-72`
