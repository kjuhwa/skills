---
description: Refresh remote cache and update installed skills to latest versions
argument-hint: [--dry-run] [--force]
---

# /skills_sync $ARGUMENTS

Pull remote updates and bring local installs up to date.

## Steps

1. **Refresh cache**
   - `git -C ~/.claude/skills-hub/remote fetch origin` then `git reset --hard origin/main` *only if* the cache has no local commits (verify with `git status`). If local commits exist, report and stop.

2. **Diff per tracked skill**
   - For each entry in `registry.json`:
     - Compare `source_commit` vs current remote HEAD for that skill's path.
     - If unchanged: skip.
     - If changed: show diff summary (files changed, version bump).

3. **Prompt user** per changed skill: update / skip / show-diff.
   - `--force` applies all updates without prompt.
   - `--dry-run` shows the diff only, writes nothing.

4. **Apply updates**
   - Overwrite local skill directory with remote version.
   - Update registry entry (`source_commit`, `version`, `synced_at`).

5. **Local-modified detection**
   - If local SKILL.md/content.md differs from stored commit content, warn user — updating will lose local edits. Offer to save a `.bak` copy.

## Rules

- Never `reset --hard` if the cache has uncommitted changes (shouldn't happen, but guard).
- Report summary at end: updated / skipped / conflicted.
