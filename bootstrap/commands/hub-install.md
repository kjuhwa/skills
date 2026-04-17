---
description: Search kjuhwa/skills.git by keyword/category and install matching skills locally, optionally pinning a version
argument-hint: <keyword | name@version> [--global] [--category=<name>] [--version=<x.y.z>] [--include-archived]
---

# /hub-install $ARGUMENTS

Install skills from the central repository matching the keyword.

## Steps

1. **Ensure remote cache exists**
   - Path: `~/.claude/skills-hub/remote/`
   - If missing: `git clone https://github.com/kjuhwa/skills.git ~/.claude/skills-hub/remote` (full clone — shallow drops tags needed for version pinning).
   - If present and older than 1h: `git -C ~/.claude/skills-hub/remote fetch --tags --prune origin` then `git pull --ff-only` (run in background if slow).
   - If clone fails (network/auth), report clearly and stop — do NOT fabricate skills.

2. **Parse version spec**
   - `$ARGUMENTS` of form `name@version` → split into keyword=`name`, version=`version`.
   - Explicit `--version=<x.y.z>` flag takes precedence.
   - Default (no version): install from `main` HEAD (latest).

3. **Search**
   - Read `~/.claude/skills-hub/remote/index.json` if present; else scan `**/SKILL.md` frontmatter.
   - **Skip archived entries.** An entry is considered archived when its `SKILL.md` frontmatter (or `index.json` record) has `archived: true`. Archived entries remain in the repo for history but must never be surfaced to installers. If the user explicitly names an archived entry (`/hub-install <exact-name>` or `name@version` that resolves to an archived entry), show a single-line notice with the `archived_reason` and stop — do not install unless the user passes `--include-archived`.
   - Match keyword against: `name`, `description`, `tags`, `triggers`, `category` (case-insensitive).
   - If `--category=<name>` flag present, restrict to that category.

4. **Present matches**
   - Show: `category/skill-name — description (tags)` in a numbered list.
   - If zero matches: suggest closest categories from `CATEGORIES.md` and stop.
   - If many (>10): show top 10 by tag-match score; ask user to narrow.

5. **Ask user** which to install (accept numbers, `all`, or `cancel`).

6. **Resolve ref per skill**
   - If a version was specified: verify tag `skills/<name>/v<version>` exists (`git -C ~/.claude/skills-hub/remote rev-parse --verify refs/tags/skills/<name>/v<version>`). If missing, list available tags for that skill via `git tag -l "skills/<name>/v*"` and stop.
   - Checkout that skill's files from the tag into a temp staging dir: `git -C <remote> show <tag>:skills/<category>/<name>/<file>` per file (keeps main working tree untouched).
   - No version → use current `main` checkout.

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
