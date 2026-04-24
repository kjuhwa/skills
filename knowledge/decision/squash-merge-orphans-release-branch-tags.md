---
version: 0.1.0-draft
name: squash-merge-orphans-release-branch-tags
type: knowledge
category: decision
tags: [git, tags, squash-merge, release, versioning, bootstrap]
summary: When a tag is created on a release branch and the PR is squash-merged to main, the tag points at a commit that is no longer reachable from main. Decision - re-tag at the squash commit on main (force-push) to keep tags discoverable.
source: { kind: session, ref: hub-bootstrap-v2.4.4-v2.5.x-releases }
confidence: high
linked_skills: []
supersedes: null
extracted_at: 2026-04-18
---

## Fact

Creating an annotated tag (e.g. `bootstrap/v2.5.0`) on a release branch (`bootstrap/release-v2.5.0`) **before** squash-merging the PR to main leaves the tag pointing at a commit that never lands on main. The resulting state:

- `git merge-base --is-ancestor bootstrap/v2.5.0 main` → **no** (tag is orphaned).
- `git log main` → never shows the tagged commit; shows only the squash-merge commit.
- `git show bootstrap/v2.5.0:path/to/file` still works because the commit is retained by the tag ref.
- But future git garbage collection on local clones can prune the blob if the tag gets deleted — fragile.

Our decision: **after squash-merge, delete the pre-merge tag and re-create it at the squash commit on main (force-push)**.

## Context / Why

Semantic tag releases (`bootstrap/v<semver>`) are the anchor for `/hub-commands-update --version=<x.y.z>`. If the tag orphans off main, users can still install at that version, but:
1. Browsing history from `main` misses the tag context.
2. Shields.io badges that filter `bootstrap/v*` tags still work.
3. GitHub's "Commits since this release" counter shows inflated numbers because main doesn't contain the tagged commit.
4. `git describe` on main returns the nearest reachable tag, which may be out of date.

Re-tagging at the squash-merge commit makes the tag a first-class citizen of main's history.

## Evidence

```bash
# During PR #1020 (v2.5.0):
git tag bootstrap/v2.5.0 <release-branch-tip>   # tag 9309c46 (pre-squash)
# Merge PR with squash → main HEAD = 4d98dfa

# After merge, tag is orphaned:
$ git merge-base --is-ancestor bootstrap/v2.5.0 main && echo yes || echo no
no

# Fix: retag at main tip, force-push
git tag -d bootstrap/v2.5.0
git tag -a bootstrap/v2.5.0 main -m "..."
git push --force origin bootstrap/v2.5.0
# Now the tag is on main, reachable, discoverable.
```

## Applies when

- You maintain a repo with semantic-versioned tags on top of squash-merge PR flow.
- You care about `git describe` accuracy, GitHub release page linkage, or badge correctness.
- You run an "install version X" command that parses tags (like `/hub-commands-update --version=2.5.0`).

## Counter / Caveats

- **Force-push on tags is a minor destructive action** — users who already fetched the pre-squash tag will see "forced update" on next fetch. Acceptable trade-off when tags are hours old and before wide distribution.
- If you use **merge commits** (not squash), this problem doesn't arise — the release branch's tagged commit is reachable from main through the merge.
- Alternative: **tag after merge**. Create branch, PR, squash-merge, then tag `main` tip. Simpler but requires discipline (don't tag on the branch).
- Never force-push tags that have been distributed for > ~24h or signed by others.
