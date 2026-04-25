---
version: 0.1.0-draft
name: env-file-prefer-main-over-worktree
summary: Makefile env-file selection must prefer .env over .env.worktree so a stray .env in a worktree does not silently point it at the main DB.
category: pitfall
tags: [makefile, worktree, env-file, dev-setup, gotcha]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: Makefile
imported_at: 2026-04-18T00:00:00Z
---

Makefile logic selects the env file like this:

```makefile
MAIN_ENV_FILE ?= .env
WORKTREE_ENV_FILE ?= .env.worktree
ENV_FILE ?= $(if $(wildcard $(MAIN_ENV_FILE)),$(MAIN_ENV_FILE),$(if $(wildcard $(WORKTREE_ENV_FILE)),$(WORKTREE_ENV_FILE),$(MAIN_ENV_FILE)))
```

So `.env` wins if both exist. The rule in CONTRIBUTING: worktrees must NOT contain a `.env`. If one sneaks in (copy-paste, accidental `cp`), the worktree silently connects to the main database.

## Why

Reversing the priority — preferring `.env.worktree` — solves the issue one way but breaks the common case where the main checkout should just use `.env`. The chosen order keeps main checkouts simple; the cost is a documentation + habit discipline around never copying `.env` into worktrees.

Tools that generate worktree envs (`scripts/init-worktree-env.sh`) refuse to overwrite existing files by default, so at least the worktree's own `.env.worktree` isn't clobbered. But there's no automated protection against a user `cp .env ../feat-branch/.env`.

## Evidence

- `Makefile:3-10` — the env-file selection logic.
- `CONTRIBUTING.md:34-43` — "Important Rules" section explicitly calling out this trap.
