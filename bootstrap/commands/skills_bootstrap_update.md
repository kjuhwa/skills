---
description: Update local slash commands (init_skills, skills_*) from kjuhwa/skills.git — latest or a specific version
argument-hint: [--version=<x.y.z>] [--dry-run] [--force]
---

# /skills_bootstrap_update $ARGUMENTS

Pull slash-command files from `bootstrap/commands/` in the remote repo and install them into `~/.claude/commands/`. Supports latest (HEAD) or a specific tagged version for rollback.

## Steps

1. **Refresh cache**
   - `git -C ~/.claude/skills-hub/remote fetch --tags --prune origin`.
   - If working tree clean: `git -C ~/.claude/skills-hub/remote checkout main && git -C ~/.claude/skills-hub/remote reset --hard origin/main`.
   - If cache dirty or has local commits: report and stop.

2. **Resolve ref**
   - `--version=<x.y.z>`: use tag `bootstrap/v<x.y.z>`. Verify it exists via `git -C <remote> rev-parse --verify refs/tags/bootstrap/v<x.y.z>`. If missing, list `git -C <remote> tag -l "bootstrap/v*" | sort -V` and stop.
   - No flag: use `main` HEAD.

3. **Diff preview (recursive)**
   - Enumerate every file under `bootstrap/commands/` at the resolved ref via `git -C <remote> ls-tree -r --name-only <ref> -- bootstrap/commands/` (recursive, all subdirectories).
   - For each path, compute its relative form (strip `bootstrap/commands/` prefix) and compare against `~/.claude/commands/<relative-path>`.
   - Show list: `NEW / UPDATED / UNCHANGED / LOCAL-MODIFIED`. Subdirectory layout (e.g. `merge/skills_merge.md`) is preserved in the report so the user can see structural changes.
   - `LOCAL-MODIFIED` = user edited their local copy; updating will overwrite — warn and offer `.bak`.

4. **Apply**
   - `--dry-run`: print plan only, write nothing.
   - Otherwise, for each file:
     - `mkdir -p ~/.claude/commands/<dir>` if the relative path includes subdirectories.
     - Extract via `git -C <remote> show <ref>:bootstrap/commands/<relative-path>` → write to `~/.claude/commands/<relative-path>`.
   - For `LOCAL-MODIFIED` files without `--force`: skip and report.
   - If an update moves a file across subdirectories (same content, new path), apply as (write new, delete old) and report the move explicitly so the user understands the reorganization.

5. **Record version**
   - Write `~/.claude/skills-hub/bootstrap.json`:
     ```json
     {
       "installed_version": "1.2.0",
       "installed_commit": "<sha>",
       "installed_at": "<iso>",
       "source_ref": "bootstrap/v1.2.0"
     }
     ```
   - If installing from `main` HEAD (no version flag), set `installed_version: "main"` and record the commit SHA.

6. **Report**
   - Show: previous version → new version, list of changed commands, any skipped due to local modifications.
   - Remind user that newly added slash commands may need a Claude Code restart to register.

## Rules

- Never touch `~/.claude/commands/` files outside `bootstrap/commands/` scope — user-authored commands stay untouched. Scope comparison uses the same relative paths, so a user-authored `~/.claude/commands/myteam/secret.md` is ignored as long as the remote has no matching `bootstrap/commands/myteam/secret.md`.
- Traversal is recursive: `bootstrap/commands/<subdir>/<file>.md` maps to `~/.claude/commands/<subdir>/<file>.md` with the relative path preserved. Never flatten subdirectories.
- Never `reset --hard` if the remote cache has uncommitted work (guard with `git status --porcelain`).
- Rollback (downgrade to older tag) is allowed; confirm explicitly when target version is lower than `installed_version`.
- If `bootstrap.json` is missing, treat as first install and proceed.
