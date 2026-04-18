---
description: Search kjuhwa/skills.git by keyword/category and install matching skills locally, optionally pinning a version
argument-hint: <keyword | name@version> [--all] [--example] [--global] [--category=<name>] [--version=<x.y.z>] [--include-archived] [--refresh] [--interactive] [--force-main]
---

# /hub-install $ARGUMENTS

Install skills from the central repository matching the keyword.


## Dispatch (v2.6.0+)

- `--all` → delegate to the `/hub-install-all` flow (bulk-install every skill + knowledge from main)
- `--example` → delegate to the `/hub-install-example` flow (copy an example project into cwd)

If none of these flags are present, run the main flow below.

## Steps

1. **Ensure remote cache exists (fast path in v2.6.3+)**
   - Path: `~/.claude/skills-hub/remote/`
   - If missing: `git clone https://github.com/kjuhwa/skills-hub.git ~/.claude/skills-hub/remote` (full clone — shallow drops tags needed for version pinning). The URL is `skills-hub.git`, not `skills.git`.
   - **Otherwise do NOT auto-fetch.** Installing always uses the current working-tree state of the remote cache. Staleness detection is the job of `/hub-sync` (explicit) or `/hub-doctor` check 9 (reports the gap). The old "fetch if older than 1h" heuristic was the top contributor to slow installs.
   - `--refresh` flag opts into an inline `git fetch --tags --prune origin && git pull --ff-only` before install (for users who know they want fresh).
   - If clone fails (network/auth), report clearly and stop — do NOT fabricate skills.

2. **Parse version spec**
   - `$ARGUMENTS` of form `name@version` → split into keyword=`name`, version=`version`.
   - Explicit `--version=<x.y.z>` flag takes precedence.
   - Default (no version): install from `main` HEAD (latest).

3. **Search**
   - Read `~/.claude/skills-hub/remote/index.json`. It's the authoritative flat catalog (rebuilt on every publish since v2.5.4). Fall back to scanning `**/SKILL.md` only if `index.json` is missing (unusual).
   - **Skip archived entries.** An entry is considered archived when its `SKILL.md` frontmatter (or `index.json` record) has `archived: true`. Archived entries remain in the repo for history but must never be surfaced to installers. If the user explicitly names an archived entry, show a single-line notice with the `archived_reason` and stop — do not install unless the user passes `--include-archived`.
   - Match keyword against: `name`, `description`, `tags`, `triggers`, `category` (case-insensitive).
   - If `--category=<name>` flag present, restrict to that category.

4. **Present matches (v2.6.3+ fast-path)**
   - **Exact-name fast path**: if the keyword equals exactly one entry's `name` field (case-insensitive exact match, after stripping `@version`), **skip the interactive prompt** and go straight to step 6. This is the common case for `/hub-install kafka-batch-consumer-partition-tuning`-style invocations and for demos. Add `--interactive` to force the prompt back on.
   - Otherwise show: `category/skill-name — description (tags)` in a numbered list.
   - If zero matches: suggest closest categories from `CATEGORIES.md` and stop.
   - If many (>10): show top 10 by tag-match score; ask user to narrow.

5. **Ask user** which to install (accept numbers, `all`, or `cancel`). Skipped entirely when step 4 hit the exact-name fast path.

6. **Resolve ref per skill (v2.6.3+ graceful fallback)**
   - **If a version was specified**, resolve in this order:
     1. **Tag match**: verify `refs/tags/skills/<name>/v<version>` exists (`git -C ~/.claude/skills-hub/remote rev-parse --verify refs/tags/skills/<name>/v<version>`). If so, use that tag.
     2. **Frontmatter match**: if the tag is missing but the current `main` copy's SKILL.md frontmatter has `version: <same-version>`, install from `main` HEAD and print a one-line warning: `note: no tag exists for v<version>, but main declares this version in frontmatter — installing from main`. Treat as pinned=true in the registry.
     3. **No match + no tags exist for this skill**: print a friendly line — `hint: this skill has no version tags yet. Drop "@<version>" to install from main, or use --force-main to proceed anyway.` Stop unless `--force-main`.
     4. **No match + other tags exist**: list available tags via `git tag -l "skills/<name>/v*"` and stop. User picks one explicitly.
   - **No version specified**: use current `main` checkout — same as before.
   - Checkout files via `git -C <remote> show <ref>:skills/<category>/<name>/<file>` per file (keeps main working tree untouched).

7. **Install selected**
   - Destination:
     - `--global` flag OR no `.claude/` dir in cwd → `~/.claude/skills/<name>/`
     - else → `.claude/skills/<name>/`
   - On name collision: show diff of existing vs remote SKILL.md (including version), ask overwrite/skip/rename.
   - Copy entire skill directory (SKILL.md + content.md + examples/).
   - Update `~/.claude/skills-hub/registry.json` entry:
     - `category`, `scope`, `installed_at`
     - `version` (resolved version string)
     - `source_commit` (tag's commit SHA, or `main` HEAD SHA if unversioned)
     - `pinned: true` when an explicit version was supplied — `/hub-sync` must skip pinned entries unless `--force`.

8. **Report**
   - List installed skills with their local path.
   - Remind user they may need to restart Claude Code session to pick up new skills.

## Rules

- **Always install from `main` branch.** All skill/knowledge sources must come from the `main` branch of the remote cache. Never use feature branches (`example/*`, `skill/*`, etc.) — they may contain outdated or unmerged content. Version-pinned installs use tags that point to commits on `main`.
- Never install without explicit user selection unless `--yes` flag.
- Never modify the remote clone cache's working tree (read-only usage).
- If `$ARGUMENTS` is empty, list top-level categories from `CATEGORIES.md` and prompt.
- **Archived entries** (`archived: true` in frontmatter or index) are excluded from search results and bulk installs. Install them only when the user explicitly names the entry AND passes `--include-archived`; then print the `archived_reason` before proceeding so the user has context.
