---
version: 0.1.0-draft
name: merged-pr-branch-orphan-commits
description: Commits pushed to a PR branch after merge do NOT reach main — they become orphaned
category: pitfall
source:
  kind: session
  ref: "session-20260418-0000"
confidence: medium
linked_skills:
  - hub-commands-publish
  - hub-publish-example
tags:
  - git
  - pull-request
  - merge
  - orphan-commits
---

**Fact:** After a PR is merged, additional commits pushed to the same branch do NOT automatically appear on `main`. The PR is closed; the branch is effectively orphaned. A new PR must be created for subsequent changes.

**Why:** GitHub merge creates a merge commit (or squash) on the target branch. The source branch is no longer tracked after merge. Pushing to it updates the branch ref but has no effect on `main`.

**How to apply:** Before pushing changes, check if the PR for the current branch is already merged (`gh pr view <number> --json state`). If merged, create a new branch from latest `main` and a new PR. Never assume an existing branch will "carry" new commits to main after merge.

**Evidence:** PR #971 (auto-hub-loop-react-vue-d3) was merged. Three subsequent commits (single-file HTML, IT nouns, 30min timeout) were pushed to the same branch but did not reach main. A new PR #1002 was needed.
