---
name: batch-pr-conflict-recovery
description: When N auto-generated PRs all touch the same catalog file and serially conflict, close them all and batch-cherry-pick the content into one PR
category: workflow
tags:
  - git
  - github
  - automation
  - conflict-resolution
---

# Batch PR Conflict Recovery Pattern

## The scenario

An automation pipeline creates many short-lived branches (e.g. `example/foo`, `example/bar`, ...), each with a small folder addition PLUS an edit to a shared catalog/index file (like `example/README.md`). The first PR merges fine. Every subsequent PR conflicts on the catalog file because `main` has advanced.

After a long automation run you wind up with 50+ `CONFLICTING` open PRs. Rebasing each one is O(N²) work.

## The fix

Treat the branches as content sources, not as PR candidates. Close all the conflicting PRs (not delete — closed PRs preserve their branches for cherry-picking). Then in one operation:

```bash
# 1. Collect branch names from closed (unmerged) PRs
BRANCHES=$(gh pr list --state closed --json headRefName,mergedAt \
  --jq '.[] | select(.mergedAt == null) | .headRefName' --limit 300)

# 2. Start a clean branch from main
git checkout main && git reset --hard origin/main
git checkout -b batch/merge-conflicting-examples

# 3. Cherry-pick just the example folders from each branch
for br in $BRANCHES; do
  slug=${br#example/}
  [ -d "example/$slug" ] && continue   # skip if already on main
  git fetch origin "$br" 2>/dev/null
  git checkout "origin/$br" -- "example/$slug" 2>/dev/null
done

# 4. Single commit, single PR, single merge
git add example/
git commit -m "batch: add N unmerged examples"
git push -u origin HEAD
gh pr create --title "batch: recover unmerged examples" --body "..."
gh pr merge --merge
```

The trick: `git checkout <branch> -- <path>` copies files from another branch into the index without involving merge machinery. No conflicts possible because we're not merging histories — just copying paths.

## Prevention

Remove the catalog-edit step from the per-item PR template. Regenerate the catalog separately (once, from `main`) after all item PRs merge:

```bash
node scripts/regenerate-catalog.js
git add example/README.md
git commit -m "docs: regenerate catalog"
```

The per-item PR becomes content-only → zero conflict surface → every PR merges without human intervention.

## Why this matters

In automated generation loops, every per-PR file conflict is unsolvable by automation (the loop can't choose "theirs" vs "ours" correctly). Preventing the conflict at source design time is orders of magnitude cheaper than recovering from accumulated conflicts afterward.
