---
version: 0.1.0-draft
name: gh-pr-create-race-with-auto-merge
type: knowledge
category: pitfall
tags: [gh-cli, pull-request, auto-merge, race-condition, pitfall]
summary: "On repos with auto-merge enabled, `gh pr create` can fail with \"No commits between main and <branch>\" because the PR was already created AND merged by automation in the time between `git push` and `gh pr create`. Detect this by checking `git merge-base --is-ancestor <branch> origin/main` before assuming failure."
source:
  kind: session
  ref: hub-commands-publish v2.3.0 + v2.4.0 publish 2026-04-17
confidence: medium
linked_skills: []
---

# Pitfall: `gh pr create` fails on auto-merge repos right after push

## Fact

Sequence on a repo with auto-merge rules (e.g. `kjuhwa/skills-hub`):

```bash
git push -u origin bootstrap/release-v2.3.0
git push origin bootstrap/v2.3.0
gh pr create --title "Bootstrap v2.3.0: ..." --body "..."
```

Third command fails:

```
pull request create failed: GraphQL: No commits between main and bootstrap/release-v2.3.0 (createPullRequest)
```

Naive interpretation: the push failed or the branch is empty. Actual cause: the repo's auto-merge bot saw the push, opened the PR, ran checks, and merged it into `main` before `gh pr create` arrived. By the time `gh` queries, the branch's commits are already reachable from `main`, so GitHub's PR API refuses to create an "empty diff" PR.

## Why

`gh pr create` asks "what commits does this branch have that main doesn't?". Post-merge, the answer is "none" — the bot's merge brought them into main. GitHub cannot tell the difference between "empty branch" and "already-merged branch" at the API level, so it returns the misleading error.

## How to apply

Before concluding that `gh pr create` failure means a broken push, check whether the branch's HEAD is already reachable from `origin/main`:

```bash
git fetch origin main
if git merge-base --is-ancestor <branch-head-sha> origin/main; then
  echo "Already merged — no PR needed. Check for an auto-created+merged PR."
else
  # Real failure: push didn't land, or branch diverged, etc.
fi
```

Then optionally:

```bash
gh pr list --repo <owner>/<repo> --head <branch> --state all --json number,state,mergedAt,url
```

to find the bot-created PR. Expect `state: MERGED` with a recent `mergedAt`.

Publishing pipelines that run `gh pr create` should **treat the error string `No commits between` as a soft-fail on auto-merge repos** — detect, log, report "already merged via PR #X", and succeed.

## Evidence

In one session both `bootstrap/release-v2.3.0` and `bootstrap/release-v2.4.0` hit this. PR #909 and #910 were both auto-created and merged by the repo's bot within seconds of push; `gh pr create` for both surfaced the misleading empty-PR error. `bootstrap/release-v2.4.1` (PR #911) did NOT auto-merge — likely a different trigger or the bot's cadence.

## Counter / Caveats

- If `git merge-base --is-ancestor` returns FALSE after push, you have a real problem — investigate before retrying the PR create. Could be: wrong base branch, branch was force-pushed after your push, your push was rejected silently.
- Not specific to `gh`: the same error text appears in GitHub web UI if you navigate to "compare" after auto-merge. It's a GitHub API limitation, not a CLI bug.
- The bot-created PR body usually differs from what you intended to write via `gh pr create`. If the PR body matters (changelog, release notes), you need to edit it via `gh pr edit <number>` after the fact — or configure the bot to use your commit message as the PR body.
