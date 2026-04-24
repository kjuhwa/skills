---
description: Update local Python tools (hub_search, _rebuild_index_json, etc.) from bootstrap/tools/ in the remote repo — latest or a specific tagged version
argument-hint: [--version=<x.y.z>] [--force] [--dry-run]
---

# /hub-tools-update $ARGUMENTS

Pull Python tool files from `bootstrap/tools/` in the remote repo and install them into `~/.claude/skills-hub/tools/`. Mirror of `/hub-commands-update` but for the `tools/` directory — together they cover the full bootstrap payload.

## Steps

1. **Refresh cache**
   - `git -C ~/.claude/skills-hub/remote fetch --tags --prune origin`.
   - If working tree clean: `git -C ~/.claude/skills-hub/remote checkout main && git -C ~/.claude/skills-hub/remote reset --hard origin/main`.
   - If cache dirty or has local commits: report and stop.

2. **Resolve ref**
   - `--version=<x.y.z>`: use tag `bootstrap/v<x.y.z>`. Verify it exists via `git -C <remote> rev-parse --verify refs/tags/bootstrap/v<x.y.z>`. If missing, list `git -C <remote> tag -l "bootstrap/v*" | sort -V` and stop.
   - No flag: use `main` HEAD.

3. **Diff preview**
   - Enumerate every `.py` file under `bootstrap/tools/` at the resolved ref via `git -C <remote> ls-tree -r --name-only <ref> -- bootstrap/tools/`.
   - For each path, compute its relative form (strip `bootstrap/tools/` prefix) and compare against `~/.claude/skills-hub/tools/<relative-path>`.
   - Show list: `NEW / UPDATED / UNCHANGED / LOCAL-MODIFIED`.
   - `LOCAL-MODIFIED` = user edited their local copy; updating will overwrite — warn and offer `.bak`.

4. **Apply**
   - `--dry-run`: print plan only, write nothing.
   - Otherwise, for each file:
     - Extract via `git -C <remote> show <ref>:bootstrap/tools/<relative-path>` → write to `~/.claude/skills-hub/tools/<relative-path>`.
     - Create a `.bak` copy of any `UPDATED` or `LOCAL-MODIFIED` file before overwriting.
   - For `LOCAL-MODIFIED` files without `--force`: skip and report.

5. **Record version**
   - Merge into `~/.claude/skills-hub/bootstrap.json`:
     ```json
     {
       "installed_version": "2.6.16",
       "installed_commit": "<sha>",
       "installed_at": "<iso>",
       "source_ref": "bootstrap/v2.6.16"
     }
     ```
   - Version key is shared with `/hub-commands-update` — a fully synced install has both commands AND tools at the same version.

6. **Report**
   - Show: previous version → new version, list of changed tools, any skipped due to local modifications.

## Rules

- **Scope is `bootstrap/tools/` only** — user-authored scripts in `~/.claude/skills-hub/tools/` outside that scope stay untouched.
- **No module-level import side effects** are run — this command only copies files. Tools are re-imported by the next `/hub-precheck` or `/hub-find` invocation.
- Rollback (downgrade to older tag) is allowed; confirm explicitly when target version is lower than current `installed_version`.
- If `bootstrap.json` is missing, treat as first install and proceed.

## Why separate from /hub-commands-update

`bootstrap/` contains two cohorts: `commands/` (markdown slash commands) and `tools/` (Python helpers). They share a version tag. A release that changes both requires running both updates. Kept as separate entry points so users can update one without touching the other when debugging a mismatch.

## Pairing

- `/hub-commands-update` — syncs `bootstrap/commands/`
- `/hub-tools-update` — syncs `bootstrap/tools/` (this command)
- `/hub-commands-publish` — pushes local command edits to the hub
