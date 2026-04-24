---
name: worktree-isolation-resolver
description: Resolve which git worktree a workflow should run in using an ordered chain (existing ref → same-workflow reuse → linked-issue share → PR branch adoption → create new), each step guarded by worktree-ownership verification against the canonical repo path.
category: workflow
version: 1.0.0
version_origin: extracted
tags: [workflow, worktree, isolation, resolver, cross-clone]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
linked_knowledge: [worktree-cross-clone-adoption-pitfall]
---

# Ordered Worktree Isolation Resolver (with Ownership Verification)

## When to use

- Your tool spawns AI-coding workflows that need an isolated git worktree per conversation.
- A conversation may come back (resume), link to an issue another conversation is already working on, reference an existing PR branch, or be brand new — and you want **one** resolver that handles all five paths predictably.
- The host machine might have multiple clones of the same remote (user cloned twice into different dirs). Worktree rows in your DB must never be silently adopted into the wrong clone.

## Steps

1. **Canonicalize the repo path once at the top.** Call `getCanonicalRepoPath(codebase.defaultCwd)` (which resolves through `.git` file indirection and realpath). Paths 2–5 all use it.
2. **Wrap the canonicalization in classify-and-block.** If the call throws a *known* isolation error (permission denied, ENOENT, malformed worktree pointer), return `{ status: 'blocked', userMessage: ... }` with a user-facing message plus an "Execution blocked to prevent changes to shared codebase" suffix. If it throws an **unknown** error, rethrow — programming bugs must surface as crashes, not silent "blocked" messages.
3. **Resolve in this fixed order** (first match wins):
   1. **Existing env reference** — the conversation's DB row already points at an env; verify worktree still exists on disk.
   2. **No codebase?** Return `{ status: 'none', cwd: '/workspace' }` — the workflow runs in a shared sandbox.
   3. **Workflow reuse** — look up an active env by `(codebaseId, workflowType, workflowId)` and reuse it.
   4. **Linked-issue sharing** — if the request has `hints.linkedIssues`, look up envs by `(codebaseId, 'issue', issueNum)` and adopt the first valid one.
   5. **PR branch adoption** — if `hints.prBranch` is set, find an on-disk worktree on that branch and adopt it.
   6. **Create new env** via the provider.
4. **At every adoption step (3, 4, 5), call `assertWorktreeOwnership(worktreePath, canonicalRepoPath)` before recording or reusing.** This ensures the DB row belongs to the same clone as the canonical repo; cross-clone mismatches throw.
5. **On cross-clone mismatch**, do **not** mark the other clone's env as destroyed — their work must continue. Re-throw so `classifyIsolationError` converts it to a user message.
6. **Best-effort stale cleanup:** if a checked env's worktree no longer exists on disk, call `store.updateStatus(id, 'destroyed')` in a try/catch that logs-and-continues (staleness shouldn't block the happy path).
7. **Return a discriminated union**, not a bare path:
   - `{ status: 'resolved', env, cwd, method: { type: 'workflow_reuse' | 'branch_adoption' | ... }, warnings? }`
   - `{ status: 'blocked', reason, userMessage }`
   - `{ status: 'none', cwd }`
   - `{ status: 'stale_cleaned', previousEnvId }`
   The caller owns messaging and DB updates.
8. **Append non-blocking warnings** (e.g. "worktree is not based on expected base branch") rather than blocking reuse. Validation failures are non-fatal; log them and pass through.
9. **On `provider.create()` success followed by `store.create()` failure**, clean up the orphaned worktree best-effort (`provider.destroy`) then re-throw the original store error. Don't mask the real failure with the cleanup failure.

## Counter / Caveats

- Ordering matters: **existing reference first**, then reuse, because a conversation that already ran once should not re-pick a different env just because a newer one happened to match the same workflow.
- Don't allow the resolver to also destroy or "finalize" envs — that's a separate lifecycle service. Keep resolve pure (only reads + adoptions).
- The `method` discriminator on the resolved result is what lets the caller phrase platform-appropriate messages ("Reused worktree X" vs "Adopted PR branch Y"). Don't collapse it into a generic "resolved."
- The `staleThresholdDays` option (default 14) guards a separate cleanup pass, not the resolve path itself. Keep them separate to avoid silent destruction of envs during resolution.

## Evidence

- `packages/isolation/src/resolver.ts` (561 lines): full implementation.
- Ordered chain at `resolver.ts:88-191` (`resolve` method).
- Canonicalize-once + classify-and-block at `resolver.ts:116-143`.
- Ownership verification at `resolver.ts:260-275` (`assertWorktreeOwnership`).
- Cross-clone refused logs: `isolation.reuse_refused_cross_checkout`, `isolation.linked_issue_refused_cross_checkout`, `isolation.branch_adoption_refused_cross_checkout`.
- Discriminated-union resolution types at `packages/isolation/src/types.ts`.
- Orphaned-worktree cleanup after store failure at `resolver.ts:514-551`.
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
