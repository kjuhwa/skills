---
name: squash-merge-detection-union
description: Classify "can this branch be cleaned up?" using the union of `git branch --merged` + `git cherry` patch-equivalence + `gh pr list` state, with clear semantics for each signal.
category: workflow
version: 1.0.0
version_origin: extracted
tags: [git, worktree, cleanup, squash-merge, pr-state, gh-cli]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
---

# Three-Way Merged-Branch Detection (`--merged` ∪ `cherry` ∪ PR state)

## When to use

- You clean up stale git worktrees / branches and want to distinguish "safe to delete" from "unmerged, don't touch."
- **Squash merges break `git branch --merged main`** because the squashed commit on `main` has a different SHA than any of the feature commits. Ancestry-based checks say "unmerged" even when the work is long shipped.
- You have `gh` CLI available for GitHub repos and want to use it as a tie-breaker when git alone is ambiguous.

## Steps

Run checks in this order, returning early on a definitive signal:

1. **Fast path — `git branch --merged <main>`.** If the branch appears in the output (minus any leading `* `), it was fast-forward or merge-commit merged. Return "safe, no open PR."

   ```ts
   const { stdout } = await exec('git', ['branch', '--merged', mainBranch]);
   const merged = stdout.split('\n').map(b => b.trim().replace(/^\* /, ''));
   if (merged.includes(branchName)) return { safe: true, openPr: false };
   ```

2. **Squash-merge detection — `git cherry <base> <branch>`.** Lines starting with `-` mean "patch already in upstream" (squash-merged or cherry-picked). Lines starting with `+` mean "genuinely not in upstream." If **every** line is `-` (or the list is empty), the branch is patch-equivalent to upstream — safe to delete.

   ```ts
   const lines = stdout.split('\n').filter(l => l.trim());
   if (lines.length === 0) return true;
   return lines.every(line => line.startsWith('-'));
   ```

3. **PR state — `gh pr list --head <branch> --state all --json state --limit 1`.** Parse the JSON, map `MERGED` → safe, `CLOSED` → safe-if-`includeClosed`-flag, `OPEN` → unsafe (and flag `openPr: true`), anything else → unknown (treat as unsafe).

4. **Error handling per signal:**
   - For `branch --merged` / `git cherry`: expected errors (unknown revision, bad revision, not a git repo, ENOENT) → return `false`/`null`, let the next signal try. Unexpected errors (permission denied, corruption) → throw.
   - For `gh`: missing binary (ENOENT or "command not found") → return `'NONE'` silently (gh is a soft dependency). Other errors → log at warn with stdout preview.
   - For the remote-URL precheck: if origin isn't `github.com`, return `'NONE'` and skip `gh`. Non-GitHub remotes are out of scope.

5. **Cache PR-state lookups per cleanup invocation.** `getPrState` takes an optional `Map<string, PrState>` so repeated queries across many branches don't re-exec `gh` (it's slow, ~100-300 ms per call).

6. **Combine signals with OR logic in a wrapper** (`computeBranchCleanupSafety` or similar): the branch is safe iff any of the three signals says so. The return type should include `{ safe: boolean, openPr: boolean }` so callers can message the user differently for "has open PR" vs "just stale."

## Counter / Caveats

- **Do not** run `git cherry` without the `--merged` fast path — it's O(commits-on-branch) whereas `--merged` is O(heads). Order matters.
- `git cherry` on an **unpushed** branch vs. a branch that has been rebased onto `main` can give surprising output (the rebased commits are patch-equivalent only to specific upstream commits). Test with a rebase scenario.
- `gh` asks the GitHub API, which is rate-limited. The per-invocation cache is mandatory for bulk cleanup. Don't switch to unauthenticated API even as a fallback.
- `gh` returns `state: 'MERGED'` even if the **merge commit was force-pushed** (a maintainer amend). Treating it as safe is correct because the platform considers it merged.
- Non-GitHub remotes (Gitea, GitLab, custom) will fall through to the ancestry checks only. That's fine — just document it.

## Evidence

- `packages/git/src/branch.ts`:
  - `isBranchMerged` (lines 186-221) — `git branch --merged`.
  - `isPatchEquivalent` (lines 236-271) — `git cherry` with lines starting with `-` meaning already-upstream.
- `packages/isolation/src/pr-state.ts` (91 lines): `gh pr list --json state` wrapper with per-invocation cache, GitHub-only remote guard, graceful handling of missing `gh` binary.
- `packages/core/src/services/cleanup-service.ts:562-578`: the three-signal union inside `computeBranchCleanupSafety` / `classifyForCleanup`:
  ```ts
  if (await isBranchMerged(...)) return { safe: true, openPr: false };
  if (await isPatchEquivalent(...)) return { safe: true, openPr: false };
  const prState = await getPrState(...);
  if (prState === 'MERGED') return { safe: true, openPr: false };
  if (prState === 'CLOSED') return { safe: includeClosed, openPr: false };
  if (prState === 'OPEN') return { safe: false, openPr: true };
  ```
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
