---
version: 0.1.0-draft
name: dev-sh-auto-setup-idempotent
summary: make dev should auto-detect worktree vs main, create the right env file, install deps, start DB, run migrations, start services — idempotent on re-run.
category: pitfall
tags: [makefile, dev-setup, idempotent, onboarding]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CONTRIBUTING.md
imported_at: 2026-04-18T00:00:00Z
---

`make dev` (via `scripts/dev.sh`) is a single command that new contributors and returning devs both run. It does:

1. Auto-detect whether you're in a main checkout or a worktree (git worktree status + env file presence).
2. Create the appropriate env file (`.env` or `.env.worktree`) if missing.
3. Verify prerequisites (Node.js, pnpm, Go, Docker) — print a clear error with install links on miss.
4. `pnpm install`.
5. Ensure the shared Postgres container is running (start it if not).
6. Create the per-checkout application database if it doesn't exist.
7. Run migrations.
8. Start backend + frontend.

## Why

Re-running `make dev` must be safe. If a step is already done (DB exists, deps installed, migrations up to date), skip it silently. The whole script should complete in a few seconds on a warm machine — cold start is where the heavy work happens.

"Re-run is safe" also means no destructive operations hidden in setup — no `DROP DATABASE`, no `pnpm install --force`. If the user wants a clean slate there's a separate destructive target (`make clean` + `docker compose down -v`).

Clear error messages on prerequisite miss (`pnpm not found, install with: brew install pnpm`) are load-bearing for contributor onboarding.

## Evidence

- `CONTRIBUTING.md` "First-Time Setup" → "Quick Start" section.
- `Makefile:175-176` — `dev:` target delegating to `scripts/dev.sh`.
