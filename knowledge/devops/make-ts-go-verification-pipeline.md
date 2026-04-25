---
version: 0.1.0-draft
name: make-ts-go-verification-pipeline
summary: Single make check that runs TypeScript typecheck + unit tests + Go tests + Playwright E2E, starting services only if they're not already running.
category: devops
tags: [makefile, verification, ci, typescript, go, playwright]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLAUDE.md
imported_at: 2026-04-18T00:00:00Z
---

One Make target runs the entire verification pipeline:

```bash
make check
```

Stages:
1. TypeScript typecheck (`pnpm typecheck` — Turbo runs it across every package).
2. TypeScript unit tests (`pnpm test` — Turbo runs Vitest per package).
3. Go tests (`cd server && go test ./...`).
4. Playwright E2E.

The check runner starts backend + frontend only if they're not already running — during development, running `make check` against a live `make dev` doesn't restart services, saving ~10s per invocation.

## Why

AI agents operating on the codebase need one command that tells them whether the change is good. Multiple separate commands are fine for human devs who know which is relevant, but hostile to an automated "write code, verify, iterate" loop. `make check` gives a boolean verdict and exits with the right code.

Also lets an agent target narrower verification on faster feedback: `pnpm typecheck` alone for TS-only changes, `make test` for Go-only changes, then `make check` at the end.

## Evidence

- CLAUDE.md, "AI Agent Verification Loop" and "Minimum Pre-Push Checks" sections.
- `scripts/check.sh` (referenced) — the orchestration.
