---
version: 0.1.0-draft
name: worktree-cross-clone-adoption-pitfall
summary: If a user has two clones of the same remote, a naive "find worktree by branch" lookup can adopt the wrong clone's worktree into the DB row, silently corrupting state.
category: pitfall
confidence: high
tags: [git, worktree, cross-clone, adoption, isolation]
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
linked_skills: [worktree-isolation-resolver]
---

# Worktree Cross-Clone Adoption Corrupts DB State

## Fact / Decision

When a tool stores "isolation environment" rows in a DB pointing at git worktree paths, a user with **two clones of the same remote** (e.g. `~/code/archon-main` and `~/code/archon-fork`) can cause silent DB corruption if the tool:

1. Creates a worktree in clone A for branch `feature/x`.
2. Later runs inside clone B and asks "do we already have a worktree for `feature/x`?".
3. Gets back clone A's path (filesystem-resolved) and **adopts it** into clone B's DB row.

Now clone B's DB row points at a worktree that clone A owns. Git operations from clone B (checkout, fetch, reset) will surprise clone A's user; cleanup in clone B will `rm -rf` clone A's worktree.

The fix is to verify, before adoption, that the worktree's repo canonicalizes to the **same path** as clone B's canonical repo (`getCanonicalRepoPath`). If they differ, refuse the adoption and **do not** mark clone A's row as destroyed — it belongs to someone else. Archon calls this `verifyWorktreeOwnership` and wraps every adoption path in it.

## Why

Git worktrees are first-class but their DB representation isn't. A path like `~/code/archon-main/.worktrees/feature-x` is a fine filesystem string but doesn't carry provenance about *which* clone created it. Only the real git metadata (`.git/worktrees/feature-x/commondir` → the canonical repo path) distinguishes them, and that check has to be explicit.

## Counter / Caveats

- **99% of users have one clone.** The cost of the ownership check is microseconds; the benefit is avoiding a catastrophic 1% case. Always do it.
- Throwing on cross-clone mismatch stops iteration across linked issues / PR adoptions. That's intentional — the user's machine state is genuinely anomalous and they should resolve it explicitly rather than have the tool silently skip the signal.
- Do **not** auto-destroy the other clone's row. Your tool doesn't own it.
- The symptom of skipping the ownership check shows up weeks later as "my branch disappeared" or "why is the other clone's worktree at a weird commit?" — extremely hard to debug after the fact. The check is cheap insurance.

## Evidence

- `packages/isolation/src/resolver.ts:260-275`: `assertWorktreeOwnership` wrapper with structured logging.
- Cross-clone refused log events: `isolation.reuse_refused_cross_checkout`, `isolation.linked_issue_refused_cross_checkout`, `isolation.branch_adoption_refused_cross_checkout` (`resolver.ts:277-407`).
- Design comment at `resolver.ts:316-325` explaining the "stop iteration on mismatch" choice for linked-issues: "if a linked env is owned by another clone, the user's machine state is anomalous."
- `verifyWorktreeOwnership` implementation lives in `packages/git/src/worktree.ts`.
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
