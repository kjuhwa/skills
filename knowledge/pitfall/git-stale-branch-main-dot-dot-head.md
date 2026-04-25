---
version: 0.1.0-draft
name: git-stale-branch-main-dot-dot-head
summary: On a stale contributor branch, `git diff main..HEAD` shows every main commit as a deletion — a 3-line PR looks like a 700-line revert.
type: knowledge
category: pitfall
confidence: high
tags: [git, code-review, squash-merge, github, triage]
source_type: extracted-from-git
source_url: https://github.com/jamiepine/voicebox.git
source_ref: main
source_commit: 476abe07fc2c1587f4b3e3916134018ebacd143d
source_project: voicebox
linked_skills: [pre-release-pr-triage-worktree]
imported_at: 2026-04-18T00:00:00Z
---

# Git stale-branch `main..HEAD` pitfall

## Problem
When a PR branch has fallen behind `main` (no rebase since being opened), reviewing it via `git diff main..HEAD` is misleading:

- `main..HEAD` is equivalent to `git log HEAD ^main` — commits reachable from HEAD but not from main.
- On a stale branch, HEAD is missing every commit that landed on main after the branch forked.
- The diff therefore shows every intervening main commit as a **deletion** from HEAD's perspective.

A 3-line change can look like a 700-line revert. Reviewers assume the PR is destructive, request changes, and waste time.

## Related problem: squash-merging a stale branch
GitHub's squash-merge computes `diff(PR-head, merge-base)`. The merge-base of a stale branch is old; the squash diff therefore includes reverting every main commit since the fork. The PR appears to "pass" CI (because the branch tip itself compiles) but squashing silently reverts other people's work.

## Fixes

**For reviewing**: always inspect the PR's actual commits, not the diff against main:
```bash
git show HEAD                      # the last commit on the PR
git show --stat HEAD               # files touched + line counts
git log --oneline main..HEAD       # the PR's commit list (not its cumulative diff)
gh pr diff <N>                     # GitHub's view, which does rebase the diff view
```

**For merging**: rebase before the squash-merge:
```bash
git fetch origin main
git rebase origin/main
# If maintainer edits are allowed:
git push <author-fork> HEAD:<branch> --force-with-lease
gh pr merge <N> --squash
```

Rebasing moves the merge-base to `origin/main`, so GitHub's squash computes a clean diff.

## Why this still catches experienced reviewers
GitHub's web UI shows a rebased diff when rendering the PR files-changed tab, so the stale-branch illusion doesn't appear there. The trap springs when a reviewer drops to the CLI to inspect the branch and uses `git diff main..HEAD` out of habit — the UI and CLI show different stories.

## Related skills
`pre-release-pr-triage-worktree` (the triage workflow that centers on reviewing the actual commit and rebasing before squash-merge).

Source references: `.agents/skills/triage-prs/SKILL.md` (see "Do NOT review via `git diff main..HEAD`").
