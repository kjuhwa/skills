---
name: git-rollback-mode-selector
description: Let operators pick how failed autonomous changes unwind — hard reset, stash-and-continue, or no-op — via one env var. The three modes trade audit-trail preservation against blast-radius containment.
category: operations
version: 1.0.0
version_origin: extracted
confidence: medium
tags: [git, rollback, autonomous-agent, recovery, operations]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 4c51382092f9cb125d3ec55475861ead8d1463a6
source_project: evolver
imported_at: 2026-04-18T02:45:00Z
---

# Git Rollback Mode Selector

## Context

An autonomous process (codegen agent, evolver, migration runner) writes changes into a git worktree. When its own validation fails, you need to decide what happens to those changes. One env var, three modes:

| Mode | Behavior | Cost |
|---|---|---|
| `hard` (default) | `git reset --hard` to pre-change HEAD; discard working tree & index | Fastest clean state; zero artifact of the failed attempt |
| `stash` | `git stash push --include-untracked` the failed attempt; HEAD returns to pre-change state | Attempt is preserved for human review; stash accumulates if failures repeat |
| `none` | Leave the tree as-is; log and abort the loop | Lets human inspect the exact failing state in place; next iteration blocked until cleanup |

Env var: `EVOLVER_ROLLBACK_MODE={hard|stash|none}`.

## Rules

- **Record the pre-change ref.** Capture `git rev-parse HEAD` at the start of each iteration; that's the rollback target. Never trust "the previous commit" — the previous iteration may have already moved HEAD.
- **Include untracked.** `hard` must also `git clean -fd` (scoped to the working dir, not recursively above it) or agents leave orphaned files. `stash` must use `--include-untracked`.
- **Fail loud on `none`.** When `none` is chosen and rollback is skipped, the loop must refuse to proceed until a human signals resume. Otherwise the next iteration runs on top of broken state.
- **Never `--force` push automatically.** Rollback is local-only. If the failed attempt was already pushed, open an issue / alert; do not rewrite remote history from an autonomous loop.
- **Tag the rollback in the audit log.** Emit `{iteration_id, rollback_mode, pre_ref, post_ref, reason}` to the event stream so you can reconstruct what happened even when `hard` erased the working tree.

## Anti-patterns

- Using `git checkout .` as the rollback — leaves untracked files and staged deletions.
- Using `git stash` with no `--include-untracked` — same leak.
- Rolling back across iterations (jumping past more than one pre-ref) — that's not rollback, that's revert; different operation, different semantics.
