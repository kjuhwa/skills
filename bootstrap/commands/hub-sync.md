---
description: Refresh remote cache and update installed skills — to latest, to a specific version, or rollback
argument-hint: [--dry-run] [--force] [--skill=<name>] [--version=<x.y.z>] [--unpin]
---

# /hub-sync $ARGUMENTS

Bring local installs to latest — or pin/rollback a specific skill to an exact version via git tags.

## Modes

- **Bulk update** (no flags): update every non-pinned skill to latest `main`.
- **Targeted version**: `--skill=<name> --version=<x.y.z>` → install that skill at tag `skills/<name>/v<x.y.z>` (rollback or forward-pin). Automatically sets `pinned: true`.
- **Unpin**: `--skill=<name> --unpin` → clear pin flag so next bulk sync tracks latest again.

## Steps

1. **Refresh cache**
   - `git -C ~/.claude/skills-hub/remote fetch --tags --prune origin`.
   - `git reset --hard origin/main` *only if* the cache has no local commits (verify with `git status`). If local commits exist, report and stop.

2. **Resolve targets**
   - Targeted mode: verify `refs/tags/skills/<name>/v<version>` exists. If missing, run `git tag -l "skills/<name>/v*" | sort -V` and print the list; stop.
   - Bulk mode: iterate `registry.json`; skip entries where `pinned: true` (unless `--force`).

3. **Diff per skill**
   - Compare local `source_commit` vs the target ref's commit for that skill's path.
   - Unchanged → skip.
   - Changed → show diff summary (files changed, version field before/after, tag name for targeted mode).

4. **Prompt user** per changed skill: update / skip / show-diff.
   - `--force` applies without prompt.
   - `--dry-run` shows the diff only, writes nothing.

5. **Apply updates**
   - Extract files via `git -C <remote> show <ref>:skills/<category>/<name>/<file>` into a staging dir, then replace the local skill directory.
   - Update registry entry:
     - `source_commit` (commit SHA the tag or main points at)
     - `version` (from SKILL.md frontmatter at that ref)
     - `synced_at` (ISO timestamp)
     - `pinned` — set `true` for targeted version installs, clear on `--unpin`, preserve otherwise.

6. **Local-modified detection**
   - If local SKILL.md/content.md differs from stored commit content, warn user — updating will lose local edits. Offer to save a `.bak` copy.

7. **Refresh indexes**
   - `git reset --hard` bypasses git hooks, so the L1/L2 index (`~/.claude/skills-hub/indexes/`) won't auto-regenerate after step 1.
   - Run `hub-precheck --skip-lint` (or `py ~/.claude/skills-hub/tools/precheck.py --skip-lint`) to refresh `00_MASTER_INDEX*.md` and `category_indexes/`.
   - Skip this step if `--dry-run` (nothing actually applied).

## Rules

- Never `reset --hard` if the cache has uncommitted changes (shouldn't happen, but guard).
- Pinned skills are skipped in bulk mode; report them as `pinned (version)` in the summary so the user knows they are frozen.
- Downgrades (rollback to older tag) are allowed — confirm explicitly when the target version is lower than the installed version.
- Report summary at end: updated / skipped / pinned / conflicted.
