---
description: Review skill drafts and push them to kjuhwa/skills.git as a branch
argument-hint: [--all | --draft=<name>] [--pr] [--branch=<name>]
---

# /skills_publish $ARGUMENTS

Publish `.skills-draft/` contents to the remote repository.

## Steps

1. **Enumerate drafts** in `.skills-draft/` (recursive).
   - If none: report and stop.

2. **Dry-run review** (always first)
   - For each draft, show:
     - Target path in remote: `skills/<category>/<skill-name>/`
     - Frontmatter
     - content.md preview (first 40 lines)
     - Collision status (exists remotely? name-similar?)
   - Ask user per draft: publish / skip / edit-first / delete-draft.
   - `--all` auto-selects publish for all (still shows dry-run).

3. **Branch + commit in remote cache**
   - Ensure `~/.claude/skills-hub/remote` is on latest main: `git fetch && git checkout main && git reset --hard origin/main`.
   - Create branch: `--branch=<name>` OR auto `skills/add-<primary-category>-<YYYYMMDD>`.
   - Copy approved drafts into `skills/<category>/<skill-name>/`.
   - Rebuild `index.json` (scan all SKILL.md frontmatter → flat JSON).
   - Commit per skill with message: `Add <category>/<name>: <one-line description>`.

4. **Push** (requires confirmation)
   - `git push -u origin <branch>`.
   - If `--pr` flag and `gh` CLI available: `gh pr create --title ... --body ...` using draft's description + source_project.
   - Otherwise print the branch name and compare URL.

5. **Cleanup drafts**
   - Move published drafts to `.skills-draft/_published/<date>/` (don't delete outright — user may want reference).

## Rules

- **Never push to `main` directly.** Always a feature branch.
- **Never skip the dry-run step.**
- Respect repo's commit style — check `git log --oneline -20` in the cache first to match format.
- If remote push fails (auth), report precisely and leave branch intact locally for retry.
- Do not include draft metadata files (`_DUPLICATE_CHECK.md`, `_new-categories.md`) in commits.
