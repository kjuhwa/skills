---
version: 0.1.0-draft
name: git-reset-hard-bypasses-all-hooks
type: knowledge
category: pitfall
tags: [git, hooks, reset, post-merge, post-commit, post-checkout, invariant]
summary: `git reset --hard` does NOT trigger post-merge, post-commit, or post-checkout hooks — workflows that rely on hooks to regenerate derived artifacts become silently stale after a reset.
source: { kind: session, ref: hub-v2.4.4-hub-sync-reindex }
confidence: high
linked_skills: []
supersedes: null
extracted_at: 2026-04-18
---

## Fact

Git's standard hooks (`post-commit`, `post-merge`, `post-checkout`, `post-rewrite`) are **not** fired by `git reset --hard`. Only:

- `post-commit` fires on `git commit` (and `merge --no-ff` which creates a commit).
- `post-merge` fires on merges that actually execute (including `git pull` with ff-merge).
- `post-checkout` fires on `git checkout <ref>` and `git clone`.
- `post-rewrite` fires on `rebase` / `commit --amend`.

`reset` is intentionally excluded because it's meant to be a low-level pointer movement. There is no `post-reset` hook in standard Git (hook extensions like `reference-transaction` exist from 2.28+ but are rarely wired up).

## Context / Why

We wired git hooks at `~/.claude/skills-hub/remote/.git/hooks/{post-merge,post-commit,post-checkout}` to run `precheck.py --skip-lint` so the L1/L2 index auto-regenerates after every mutation. `/hub-sync` uses `git fetch --tags --prune` + `git reset --hard origin/main` to avoid merge conflicts on the cache. That advances HEAD (the working tree changes) but fires **no hooks**, so the indexes went stale silently after every `/hub-sync`.

## Evidence

Reproduction in this session:
```bash
# Given: post-commit hook regenerates indexes/
echo "test" > foo.txt && git add foo.txt && git commit -m "x"
# Hook fires → indexes/ mtime updates  ✅

git reset --hard HEAD~1
# Hook does NOT fire → indexes/ stale  ❌
```

## Applies when

- Your workflow uses post-* hooks to keep derived artifacts (indexes, caches, generated code) in sync.
- You or a tool ever runs `git reset --hard`, `git restore --source`, or shell-scripts the ref pointer directly.

## Counter / Caveats

- Workaround in our stack: `/hub-sync` now explicitly calls `hub-precheck --skip-lint` at the end (see PR #1019, bootstrap v2.4.4). Rule codified in global CLAUDE.md: "mutation commands must go through `git commit` OR call `hub-precheck`."
- Alternative for power users: configure `reference-transaction` hook (Git 2.28+) which DOES fire on `reset`. More invasive setup.
- Do NOT rely on `git merge --ff-only` firing post-merge — it does, but only because it's still technically a merge, not because of ref movement. `reset` is different.
