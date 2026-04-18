---
description: Diagnose and repair the local skills hub environment — cache, registry, tools, bin, indexes, git hooks, PATH, and the pre-implementation auto-check block
argument-hint: [--fix] [--verbose]
---

# /hub-doctor $ARGUMENTS

Local environment health check and repair. While `/hub-cleanup` maintains the **remote** repository, `/hub-doctor` focuses on your **local** installation.

## Checks (run in order)

### 1. Remote cache integrity
- `~/.claude/skills-hub/remote/` exists and is a git repo (`git -C <path> rev-parse --git-dir`).
- Working tree is clean (`git status --porcelain` is empty).
- Remote origin URL matches expected (`https://github.com/kjuhwa/skills-hub.git` or SSH equivalent).
- HEAD is detached or on `main` — warn if on a stale feature branch.
- **Fix**: re-clone if corrupt (`--fix` required); checkout main if on wrong branch.

### 2. Registry consistency
- `~/.claude/skills-hub/registry.json` exists and is valid JSON.
- `version` field is `2`. If `1`, offer migration.
- Every `skills.<slug>` entry has a corresponding directory at its `path`.
- Every `knowledge.<slug>` entry has a corresponding file at its `path`.
- No duplicate slugs across skills and knowledge (slug collision).
- **Fix**: remove orphan registry entries; migrate v1→v2 (`--fix` required).

### 3. Filesystem ↔ registry sync
- Scan `~/.claude/skills/*/SKILL.md` (global) and `.claude/skills/*/SKILL.md` (project).
- Cross-reference with registry:
  - `[ORPHAN REGISTRY]` — in registry but file missing.
  - `[UNTRACKED]` — file exists but not in registry.
  - `[PATH MISMATCH]` — registry path doesn't match actual location.
- Scan `~/.claude/skills-hub/knowledge/**/*.md` similarly.
- **Fix**: re-register untracked entries; remove orphan entries (`--fix` required).

### 4. Directory structure
- All expected directories exist:
  - `~/.claude/skills-hub/knowledge/{api,arch,pitfall,decision,domain}/`
  - `~/.claude/skills-hub/external/`
  - `.skills-draft/`, `.knowledge-draft/` (project-level, if `.claude/` exists in cwd)
- `.gitignore` includes `.skills-draft/` and `.knowledge-draft/`.
- **Fix**: create missing directories; append to `.gitignore` (`--fix` required).

### 5. Bootstrap version
- `~/.claude/skills-hub/bootstrap.json` exists and is valid JSON.
- `installed_version` is not `"unknown"`.
- Compare with latest `bootstrap/v*` tag in cache — warn if N minor versions behind.
- **Fix**: recreate `bootstrap.json` from current command files (`--fix` required).

### 6. Permission & encoding
- All `SKILL.md` and knowledge `*.md` files are UTF-8 readable.
- No files with BOM markers that might cause parse issues.
- No files > 1MB (unusually large skill/knowledge — likely a mistake).
- Slash command files under `~/.claude/commands/hub-*.md` are **LF-terminated** (not CRLF). CRLF silently breaks YAML frontmatter parsing on Windows; description falls back to H1 body and argument-hint disappears.
- **Fix**: `sed -i 's/\r$//' ~/.claude/commands/hub-*.md` (report only; requires user to confirm).

### 7. Tools & bin installation (v2.5.0+)
- `~/.claude/skills-hub/tools/` exists and contains the expected helper scripts:
  - `precheck.py`, `hub_search.py`, `_rebuild_index_json.py`, `_build_master_index.py`, `_build_master_index_lite.py`, `_build_category_indexes.py`, `_lint_frontmatter.py`, `_fix_frontmatter.py`, `_index_diff.py`, `install-hooks.sh`.
- `~/.claude/skills-hub/bin/` exists and contains executable wrappers:
  - `hub-search`, `hub-precheck`, `hub-index-diff` — each readable and with execute permission.
- **Fix**: re-run `bash ~/.claude/skills-hub/remote/bootstrap/install.sh` to reinstall from the current bootstrap version (`--fix` required; bootstrap must be present in the remote cache).

### 8. Git hooks (v2.5.0+)
- `~/.claude/skills-hub/remote/.git/hooks/` contains:
  - `post-merge`, `post-commit`, `post-checkout`
- Each hook file is executable (Linux/macOS/WSL) or at least present (Windows Git Bash treats the `x` bit differently).
- Each hook invokes `precheck.py --skip-lint` (or the current equivalent) — not the default sample hooks from git init.
- **v2.6.11+**: `post-merge` additionally contains an auto-patch block that re-runs `bootstrap/install.sh` when `bootstrap/**` changes are pulled in. Verify the hook contains `SKILLS_HUB_NO_AUTO_PATCH` and a reference to `bootstrap/install.sh`. If absent on a v2.6.11+ install, auto-patch won't fire and users must re-run install.sh manually after `/hub-sync`.
- **Fix**: run `bash ~/.claude/skills-hub/tools/install-hooks.sh` to reinstall (`--fix` required). If `tools/install-hooks.sh` is missing, escalate to check 7 first.

### 9. Indexes freshness (v2.5.0+)
- `~/.claude/skills-hub/indexes/` exists with:
  - `00_MASTER_INDEX.md` (full L1)
  - `00_MASTER_INDEX_LITE.md` (compact L1)
  - `category_indexes/` (L2)
- Each file's mtime is more recent than the remote's `HEAD` commit timestamp. If older, indexes are stale (git hooks likely didn't fire, e.g. after a `git reset --hard` or on a fresh clone before hook install).
- **Fix**: run `py -3 ~/.claude/skills-hub/tools/precheck.py --skip-lint` to regenerate indexes (`--fix` required).

### 10. Shell PATH (v2.5.0+)
- Run `type hub-search` (or PowerShell `Get-Command hub-search`) — it should resolve to `~/.claude/skills-hub/bin/hub-search`.
- If missing, warn the user to add to their shell profile:
  - `bash/zsh`: `export PATH="$HOME/.claude/skills-hub/bin:$PATH"` in `~/.bashrc` / `~/.zshrc`.
  - `PowerShell`: `$env:Path = "$HOME\.claude\skills-hub\bin;" + $env:Path` in `$PROFILE`.
- **Fix**: report only — modifying a user's shell profile is out of scope for auto-fix.

### 11. Pre-implementation auto-check block (v2.5.2+)
- `~/.claude/CLAUDE.md` exists and contains a `<skills_hub>` block.
- If absent: INFO (not a failure) — the user opted out of the auto-check, `/hub-suggest` still works manually.
- If present: verify the block references the canonical names (`/hub-find`, `/hub-install`, `/hub-list`, `/hub-publish`) rather than legacy ones (`/hub-search-skills`, `/hub-publish-all`).
- **Fix**: report only — user CLAUDE.md edits are out of scope for auto-fix.

### 12. UserPromptSubmit auto-suggest hook (v2.6.10+)
- `~/.claude/skills-hub/hooks/hub-suggest-hint.py` exists and is readable.
- `~/.claude/settings.json` exists and contains a `UserPromptSubmit` hook entry tagged with `"_marker": "skills-hub:auto-suggest-hook"` (fallback: a hook whose `command` references `hub-suggest-hint`).
- The registered command's script path matches the installed hook path (not a stale path from a prior install in a different `CLAUDE_DIR`).
- If the env var `SKILLS_HUB_NO_AUTO_SUGGEST=1` was set during install: INFO (user opted out).
- **Fix**: run `python ~/.claude/skills-hub/tools/_merge_settings.py install ~/.claude/settings.json` with the correct command on stdin, or re-run `bash ~/.claude/skills-hub/remote/bootstrap/install.sh` to re-register (`--fix` required).

## Report format

```
hub-doctor results (2026-04-18 23:55):

  [PASS]  1. Remote cache integrity (main @ 56a1091, clean, origin = kjuhwa/skills-hub)
  [WARN]  2. Registry consistency — 2 orphan entries
  [FAIL]  3. Filesystem sync — 3 untracked skills, 1 path mismatch
  [PASS]  4. Directory structure
  [PASS]  5. Bootstrap (v2.6.2, latest)
  [WARN]  6. Permissions — 4 commands have CRLF line endings
  [PASS]  7. Tools & bin installation (v2.5.0+)
  [FAIL]  8. Git hooks — post-merge missing; post-commit size suspicious
  [WARN]  9. Indexes freshness — 00_MASTER_INDEX.md is 2h older than HEAD
  [PASS] 10. Shell PATH (hub-search resolves)
  [INFO] 11. <skills_hub> block not present in ~/.claude/CLAUDE.md
  [FAIL] 12. UserPromptSubmit auto-suggest hook not registered in settings.json

  Summary: 6 passed, 3 warnings, 3 failures, 1 info
  Run /hub-doctor --fix to repair 4 issues automatically (registry, hooks, indexes, auto-suggest hook).
  3 issues require manual attention (CRLF, filesystem mismatch, CLAUDE.md block).
```

With `--verbose`: expand each check to show individual items (orphan names, untracked paths, hook contents diff, index mtime deltas, etc.).

## Arguments

- `--fix` — automatically repair fixable issues. Prompts for confirmation before each destructive repair (re-clone, registry entry removal, reinstalling hooks).
- `--verbose` — show detailed per-item results for every check.

## Rules

- **Default is read-only** — without `--fix`, only diagnose and report.
- **Never delete installed skills** — only clean up registry entries that point to missing files.
- **Never modify the remote** — this is local-only.
- **Never re-clone without confirmation** — even with `--fix`, prompt before destructive actions.
- **Never edit the user's shell profile or CLAUDE.md** — report only; user confirms the change manually.
- If the environment is completely uninitialized, suggest `/hub-init` instead of trying to fix from scratch.
- Exit with a clear summary: pass/warn/fail/info counts + next steps.
