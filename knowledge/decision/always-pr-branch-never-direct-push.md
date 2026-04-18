---
version: 0.1.0-draft
name: always-pr-branch-never-direct-push
description: "Always create a feature branch and PR for shared repos — never push directly to main, even for 'obvious' additions"
type: knowledge
category: decision
source:
  kind: session
  ref: session-2026-04-16-hub-make-publish
confidence: high
tags: [git, pr, workflow, shared-repo, review]
---

## Fact

When publishing hub-make examples, the first attempt pushed 2 commits directly to main. The user noticed no PR was created ("pr 이 안왔는데?"). Fix required: force-pushing main back to the pre-commit state, creating a feature branch from the commits, and then creating a proper PR.

## Why

Shared repos (like skills-hub) expect PR-based workflow for:
- Code review before merge
- CI checks on the branch
- Notification to repo watchers
- Ability to request changes before content lands in main
- Audit trail of who approved what

Direct pushes bypass all of these. The recovery (force-push main, create branch, re-push) is riskier than doing it right the first time.

## How to apply

```bash
# ALWAYS this pattern for shared repos:
git checkout -b feat/<descriptive-name>
git add <files>
git commit -m "<message>"
git push -u origin feat/<descriptive-name>
gh pr create --base main --head feat/<descriptive-name> --title "..." --body "..."
```

- Never `git push origin main` for content changes
- If you accidentally push to main: `git checkout -b <branch> HEAD`, then `git checkout main && git reset --hard origin/main~N`, then `git push --force origin main` and `git push -u origin <branch>`
- The `/hub-publish-example` skill should always use branches

## Counter / Caveats

For personal repos where you're the sole contributor, direct-to-main is fine. This rule is specifically for shared/team repos. Also, force-pushing main to recover is itself risky if others have pulled — do it quickly.
