---
description: Completely uninstall the skills-hub bootstrap layer — remote cache, tools, bin, completions, indexes, registry, slash commands, and the seed skill. Dry-run by default. Creates a backup tarball unless --no-backup.
argument-hint: [--apply] [--keep-installed|--purge-installed] [--keep-claude-md-block] [--no-backup] [--backup-path=<path>] [--force]
---

# /hub-uninstall $ARGUMENTS

Complete removal of the skills-hub infrastructure from `~/.claude/`. Inverse of `bootstrap/install.sh` — undoes everything the installer set up.

**Destructive.** A full backup tarball is written to `~/.claude/skills-hub.backup-<YYYYMMDD-HHMM>.tar.gz` before any deletion, unless `--no-backup`. Dry-run is the default; use `--apply` to execute.

## What gets removed (with `--apply`)

| Target | Notes |
|---|---|
| `~/.claude/skills-hub/remote/` | Git clone cache (skills + knowledge + bootstrap source tree) |
| `~/.claude/skills-hub/tools/` | Python helpers (precheck, indexers, linters) |
| `~/.claude/skills-hub/bin/` | Shell wrappers (`hub-search`, `hub-precheck`, `hub-index-diff`) |
| `~/.claude/skills-hub/completions/` | bash/zsh/ps1 completion scripts (v2.6.4+) |
| `~/.claude/skills-hub/indexes/` | Generated L1/L2 markdown indexes |
| `~/.claude/skills-hub/knowledge/` | Globally-installed knowledge entries (v2.6.5+) |
| `~/.claude/skills-hub/registry.json` | Hub install registry |
| `~/.claude/skills-hub/bootstrap.json` | Installed-version metadata |
| `~/.claude/skills-hub/` (empty dir) | Root container, after contents are gone |
| `~/.claude/commands/hub-*.md` | All slash commands shipped by bootstrap |
| `~/.claude/skills/skills-hub/` | Seed skill installed alongside commands |

## What's preserved (by default)

- **Individually-installed skills** at `~/.claude/skills/<slug>/` (everything other than `skills-hub/`) — use `/hub-remove` per slug to drop them first, or pass `--purge-installed` to include them in this run.
- **Project-scoped installs** under `<any-project>/.claude/skills/` and `<any-project>/.claude/knowledge/` — this command only touches `~/.claude/**`.
- **`~/.claude/CLAUDE.md`** — the file is never deleted. If it contains a `<skills_hub>` … `</skills_hub>` block, only the block is removed. `--keep-claude-md-block` leaves even the block intact.

## Steps

1. **Pre-flight scan (always runs — even in dry-run)**
   - Walk `~/.claude/skills-hub/` and collect every path that would be deleted. Compute byte count per subdirectory.
   - List `~/.claude/commands/hub-*.md`. Count.
   - Check `~/.claude/skills/skills-hub/` — exists or not.
   - Parse `~/.claude/CLAUDE.md`; locate `<skills_hub>` and `</skills_hub>` markers. Record line range.
   - Walk `~/.claude/skills/` (excluding `skills-hub/`) and cross-reference with `registry.json → skills.<slug>` to count individually-installed skills (these are **preserved** unless `--purge-installed`).
   - Print a clean summary:

     ```
     Would remove:
       ~/.claude/skills-hub/remote/             1.2 GB
       ~/.claude/skills-hub/tools/              120 KB
       ~/.claude/skills-hub/indexes/             45 MB
       ~/.claude/skills-hub/knowledge/          320 KB  (4 knowledge entries)
       ~/.claude/skills-hub/registry.json       120 KB  (416 skills + 4 knowledge)
       ~/.claude/commands/hub-*.md               32 files
       ~/.claude/skills/skills-hub/              18 KB
       ~/.claude/CLAUDE.md <skills_hub> block    lines 42–87 (block only)

     Would preserve:
       ~/.claude/skills/<installed slugs>/      416 entries (individually installed)
       ~/.claude/CLAUDE.md                       everything outside the block
       <any-project>/.claude/**                  untouched

     Backup:
       ~/.claude/skills-hub.backup-20260419-1405.tar.gz   (~1.3 GB estimated)
     ```

2. **Without `--apply`: stop.** Print `Dry-run complete. Re-run with --apply to execute.` Exit 0.

3. **With `--apply`: confirm.**
   - Prompt: `Type "UNINSTALL" to confirm. Anything else aborts: `
   - Case-sensitive literal match. No y/N shortcut for whole-hub deletion.
   - `--force` skips this prompt (for automation); prints a large warning banner first.

4. **Backup (unless `--no-backup`)**
   - `tar czf <backup-path> -C ~/.claude skills-hub commands/hub-*.md skills/skills-hub`
   - Default `<backup-path>`: `~/.claude/skills-hub.backup-<YYYYMMDD-HHMM>.tar.gz`. Override with `--backup-path=<path>`.
   - If `tar` is missing (rare, but possible on fresh Windows without Git Bash): fall back to copying the tree to `~/.claude/skills-hub.backup-<timestamp>/`. Warn that no compression happened.
   - Print backup path + size. Highlight prominently — **it is the only rollback path.**

5. **Delete (ordered for fail-safety)**

   a. `~/.claude/commands/hub-*.md` first — stops the slash commands from being invokable mid-uninstall (prevents partial-state reinvocation).
   b. `~/.claude/skills/skills-hub/` — the seed skill.
   c. `~/.claude/skills-hub/` entire tree — remote cache + tools + bin + completions + indexes + knowledge + registry + bootstrap.json.
   d. `<skills_hub>` block from `~/.claude/CLAUDE.md` — unless `--keep-claude-md-block`. Parse the file, remove the block and any surrounding blank lines that would be left stranded. Never delete or truncate the file itself.
   e. If `--purge-installed`: also delete `~/.claude/skills/<slug>/` for every slug in `registry.json → skills`. Skip anything not on disk.

6. **Post-uninstall verification**
   - `test ! -d ~/.claude/skills-hub/` — the directory should be gone.
   - `ls ~/.claude/commands/ | grep '^hub-'` — empty.
   - `test ! -d ~/.claude/skills/skills-hub/` — gone.
   - `grep -q '<skills_hub>' ~/.claude/CLAUDE.md` — should return non-zero (no match), unless `--keep-claude-md-block`.
   - Print a summary with bytes freed and the backup path.

## Arguments

- `--apply` — execute. Without this, dry-run only.
- `--no-backup` — skip the tarball. **Not recommended.** Rollback becomes impossible.
- `--backup-path=<path>` — override backup destination (default: `~/.claude/skills-hub.backup-<timestamp>.tar.gz`).
- `--keep-claude-md-block` — leave the `<skills_hub>` block in `~/.claude/CLAUDE.md` untouched.
- `--keep-installed` — **(default)** preserves individually-installed skills at `~/.claude/skills/<slug>/`. Kept as an explicit flag for script clarity.
- `--purge-installed` — also delete every `~/.claude/skills/<slug>/` that `registry.json` tracks. Does NOT touch project-scoped installs. Extra caution.
- `--force` — skip the `UNINSTALL` literal confirmation. Automation only; prints a warning banner.

## Rules

- **Dry-run is the default.** Never delete anything without `--apply`.
- **Backup is mandatory by default.** Only `--no-backup` skips.
- **Confirmation is mandatory** unless `--force`. The confirmation string is literal `UNINSTALL` — case-sensitive.
- **Never touch projects outside `~/.claude/`.** Project `.claude/` trees are always preserved.
- **Never delete `~/.claude/CLAUDE.md` as a whole.** Only the `<skills_hub>` block is ever removed.
- **Never delete `~/.claude/skills/<slug>/` unless `--purge-installed`.** Curated installs are preserved by default.
- **Abort on uncommitted remote changes.** If the pre-flight scan finds `git status --porcelain` non-empty in `~/.claude/skills-hub/remote/`, warn loudly; require `--force` to continue. The backup still preserves them, but the user should see the warning.
- **Idempotent.** If already uninstalled (pre-flight finds nothing), print `skills-hub not installed — nothing to do.` and exit 0.

## When NOT to use

- **To remove one skill:** use `/hub-remove <slug>`. This command is hub-wide.
- **To fix a broken hub:** try `/hub-doctor --fix` first. Most broken states are repairable without nuking everything.
- **To reinstall:** run `/hub-uninstall --apply`, then re-clone and run `bash install.sh`. Backup tarball is the rollback if anything goes wrong.

## Rollback

```bash
tar xzf ~/.claude/skills-hub.backup-<timestamp>.tar.gz -C ~/.claude
```

This restores `~/.claude/skills-hub/`, `~/.claude/commands/hub-*.md`, and `~/.claude/skills/skills-hub/`. The `<skills_hub>` block in `CLAUDE.md` is NOT backed up as a file (it was edited in place); reinstall via `bash install.sh` to get a fresh default, or re-add the block from `remote/README.md` manually.
