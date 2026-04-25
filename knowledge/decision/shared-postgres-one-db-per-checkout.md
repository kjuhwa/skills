---
version: 0.1.0-draft
name: shared-postgres-one-db-per-checkout
summary: All worktrees share one PostgreSQL container; isolation happens at the database level, not via separate Compose projects.
category: decision
tags: [postgres, worktree, dev-setup, isolation, monorepo]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CONTRIBUTING.md
imported_at: 2026-04-18T00:00:00Z
---

One Docker Compose `postgres` service serves every checkout on the machine. Each worktree gets its own:
- `POSTGRES_DB` name (derived from worktree directory slug)
- `PORT` and `FRONTEND_PORT` (derived from worktree path hash, to avoid collisions)

All checkouts still connect to `localhost:5432`. The main checkout uses `.env` and DB `multica`; worktrees use `.env.worktree` with names like `multica_my_feature_702`.

## Why

The naive alternative — one Compose project per worktree — wastes disk (one volume per worktree), ties up ports, and makes "test main and branch side-by-side" painful. One shared container with per-DB isolation keeps Docker resource usage flat while still isolating schema and data.

Hard rule: worktrees must use `.env.worktree` not `.env`. The Makefile prefers `.env` if it exists, so a stray `.env` in a worktree accidentally points it at the main database — real footgun. Tools that generate worktree envs (`scripts/init-worktree-env.sh`) refuse to overwrite existing ones.

Database creation is automatic: `make setup`, `make start`, `make dev`, `make test`, `make migrate-up/down`, and `make check` all ensure the target DB exists via `scripts/ensure-postgres.sh` before running.

## Evidence

- `CONTRIBUTING.md` "Development Model" and "Environment Files" sections.
- `Makefile:3-10` — ENV_FILE preference logic.
- `scripts/ensure-postgres.sh` (referenced) — idempotent DB-exists check.
