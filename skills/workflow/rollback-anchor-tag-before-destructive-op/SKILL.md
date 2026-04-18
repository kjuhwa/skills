---
name: rollback-anchor-tag-before-destructive-op
description: Before running any large or destructive operation on a shared git repo (bulk edit + merge, force-push, reset --hard on main), create and push an annotated tag at the pre-change state. Cheap insurance, immediate rollback path, no ambiguity about "where was it before".
category: workflow
tags: [git, tags, rollback, safety, destructive-ops, pr-flow]
triggers: [force-push, reset --hard, bulk edit, backfill, mass rewrite, "before I", "rollback to"]
source_project: skills-hub-bootstrap-v2.4.x-releases
version: 0.1.0
---

# rollback-anchor-tag-before-destructive-op

## Problem

You're about to run something that touches many files or shared refs:

- Bulk frontmatter backfill across 500+ files.
- Force-push to a branch others may have pulled.
- `git reset --hard` on main.
- Mass rename or refactor that goes through `git add -A` + `git commit`.

If it goes wrong, "where was main before" becomes fuzzy. `reflog` helps *you* but not teammates, and expires. Branch names can drift. The commit hash is easy to lose in a shell scrollback.

## Pattern

**Pre-step 0 of any destructive op: create an annotated, push it, reference it in the PR body.**

```bash
# Before the op:
git tag -a backup/pre-<operation>-<yyyymmdd> <commit-before-change> \
    -m "Rollback anchor before <operation> (<date>)"
git push origin backup/pre-<operation>-<yyyymmdd>

# Now do the op.

# In the PR description, include a "Rollback" section:
# git reset --hard backup/pre-<operation>-<yyyymmdd>
# git push --force-with-lease origin HEAD:main
```

Naming convention: `backup/pre-<short-operation-name>-<yyyymmdd>`.

- `backup/` namespace keeps anchors separate from release tags.
- `pre-` prefix signals intent ("this is the before state").
- Date disambiguates multiple anchors per day by operation name.

## Example

During the skills-hub frontmatter backfill (532 files touched):

```bash
# Pre-backfill anchor (before the first PR touched files):
git tag -a backup/pre-frontmatter-backfill-20260418 main \
    -m "Rollback anchor before frontmatter backfill (main @ 71f6a63, 2026-04-18)"
git push origin backup/pre-frontmatter-backfill-20260418

# Second anchor right before release → main merge (because main moved meanwhile):
git tag -a backup/pre-backfill-merge-main-20260418 6db940e \
    -m "Rollback anchor: main tip right before frontmatter-backfill merge"
git push origin backup/pre-backfill-merge-main-20260418
```

Both anchors included in the PR description with ready-to-paste rollback commands. Zero ambiguity when anyone later asks "can we undo this?"

## When to use

- Any PR that touches more than ~50 files.
- Any `--force`, `--force-with-lease`, `reset --hard` on a shared branch.
- Bulk automated edits (linter auto-fix, codemod, formatter migration).
- Schema / directory structure migrations.
- Right before merging a large PR to main, add a second anchor at main's current tip — because main may have advanced since the first anchor was created.

## Pitfalls

- **Don't confuse anchor tags with release tags.** Use different namespaces (`backup/*` vs `bootstrap/v*`, `skills/.../v*`).
- **Push the anchor before the op.** Local-only tags don't help teammates.
- **Document the rollback command in the PR description.** A tag is just a label; the command is the escape hatch.
- **Clean up stale anchors** after a few weeks (once you're confident the change is stable) to keep the tag list readable. `git push origin --delete backup/pre-foo-20260401`.
- **Don't anchor-tag for small PRs.** Single-commit, fully-reviewable PRs have git revert; anchor tags are overkill.
