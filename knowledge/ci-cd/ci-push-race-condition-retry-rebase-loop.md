---
name: ci-push-race-condition-retry-rebase-loop
summary: Parallel CI jobs pushing to the same branch (e.g., `gh-pages`) race; solve with a `git pull --rebase` + retry loop with exponential backoff, or serialize jobs with `needs:` dependencies to avoid the race entirely.
category: ci-cd
tags: [ci-cd, git-push, race-condition, gh-pages, retry, rebase, github-actions, concurrency]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: medium
---

# CI Push Race Condition: Retry Rebase Loop

## Context

CI/CD pipelines that build multiple package formats in parallel (e.g., `.deb`
and `.rpm`) and publish them to a shared branch (e.g., `gh-pages` for a
package repository) face a write-write race condition: both jobs push to the
same branch near-simultaneously. One succeeds; the other fails with
"Updates were rejected because the remote contains work that you do not have
locally."

GitHub Pages deployment adds a third actor: the Pages deployment workflow
runs automatically on every push to `gh-pages` and may itself modify the
branch.

## Observation

The race manifests as:

```
error: failed to push some refs to 'origin'
hint: Updates were rejected because the remote contains work that you do not
hint: have locally. Integrate the remote changes (e.g.
hint: 'git pull ...') before pushing again.
```

This happens even with fresh checkouts because both jobs clone the `gh-pages`
branch at `T=0` (same state), both add their files, and then race to push at
`T=N`.

Job dependencies (`needs: [other-job]`) fully eliminate the race by
serializing the jobs, but increase total pipeline time.

A retry loop with `git pull --rebase` handles the common case where one job
finishes just before another and the rebase is fast (no real conflict):

```bash
MAX_RETRIES=5
ATTEMPT=0

while (( ATTEMPT < MAX_RETRIES )); do
  if git push origin gh-pages; then
    echo "Push succeeded on attempt $((ATTEMPT + 1))"
    break
  fi

  ATTEMPT=$(( ATTEMPT + 1 ))
  if (( ATTEMPT >= MAX_RETRIES )); then
    echo "Push failed after $MAX_RETRIES attempts" >&2
    exit 1
  fi

  echo "Push failed, rebasing and retrying (attempt $ATTEMPT)..."
  git pull --rebase origin gh-pages

  # Exponential backoff: 2^attempt seconds
  sleep $(( 2 ** ATTEMPT ))
done
```

## Why it happens

`git push` is not atomic at the application level across multiple CI runners.
Two runners that cloned the branch at the same ref cannot both push without
one failing — the second push will be rejected because the remote ref has
advanced since the clone.

`git pull --rebase` fast-forwards the local branch to the new remote state
and replays any local commits on top, allowing the retry push to succeed
unless there is a true content conflict (which should not happen if each
job writes to different files in the branch).

GitHub Pages auto-deployment also creates commits on `gh-pages` (to update
metadata files), adding a third concurrent writer.

## Practical implication

Choose the approach based on the tradeoff:

**Option 1: Serialize with `needs:`**
```yaml
jobs:
  publish-apt:
    steps:
      - uses: actions/checkout@v4
        with: { ref: gh-pages }
      - name: Add deb package
        run: |
          # ... add files, commit
          git push origin gh-pages

  publish-rpm:
    needs: [publish-apt]  # serializes the push
    steps:
      # ... same pattern
```
- Pro: simple, guaranteed no conflicts.
- Con: increases total pipeline time.

**Option 2: Retry loop** (if parallel speed is important)
- Use the retry loop above.
- Limit to 5-10 attempts with backoff.
- Ensure each job writes to non-overlapping paths to avoid real rebase
  conflicts.

Either approach is better than no mitigation. The retry loop handles transient
races well but is not a substitute for proper serialization when jobs write to
the same file paths.

## Source reference

- `CLAUDE.md`: "Consider Concurrency" section — "Multiple jobs writing to the
  same branch will race — add job dependencies or retry loops with
  `git pull --rebase` before push."
- `CLAUDE.md`: "Common CI Pitfalls" table — "Push rejected (ref changed):
  Add `git pull --rebase` before push, with retry loop."
