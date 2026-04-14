---
description: Search kjuhwa/skills.git by keyword/category and install matching skills locally
argument-hint: <keyword> [--global] [--category=<name>]
---

# /init_skills $ARGUMENTS

Install skills from the central repository matching the keyword.

## Steps

1. **Ensure remote cache exists**
   - Path: `~/.claude/skills-hub/remote/`
   - If missing: `git clone --depth=1 https://github.com/kjuhwa/skills.git ~/.claude/skills-hub/remote`
   - If present and older than 1h: `git -C ~/.claude/skills-hub/remote pull --ff-only` (run in background if slow)
   - If clone fails (network/auth), report clearly and stop — do NOT fabricate skills.

2. **Search**
   - Read `~/.claude/skills-hub/remote/index.json` if present; else scan `**/SKILL.md` frontmatter.
   - Match keyword against: `name`, `description`, `tags`, `triggers`, `category` (case-insensitive).
   - If `--category=<name>` flag present, restrict to that category.

3. **Present matches**
   - Show: `category/skill-name — description (tags)` in a numbered list.
   - If zero matches: suggest closest categories from `CATEGORIES.md` and stop.
   - If many (>10): show top 10 by tag-match score; ask user to narrow.

4. **Ask user** which to install (accept numbers, `all`, or `cancel`).

5. **Install selected**
   - Destination:
     - `--global` flag OR no `.claude/` dir in cwd → `~/.claude/skills/<name>/`
     - else → `.claude/skills/<name>/`
   - On name collision: show diff of existing vs remote SKILL.md, ask overwrite/skip/rename.
   - Copy entire skill directory (SKILL.md + content.md + examples/).
   - Update `~/.claude/skills-hub/registry.json` with entry (category, source_commit, scope, installed_at).

6. **Report**
   - List installed skills with their local path.
   - Remind user they may need to restart Claude Code session to pick up new skills.

## Rules

- Never install without explicit user selection unless `--yes` flag.
- Never modify the remote clone cache's working tree (read-only usage).
- If `$ARGUMENTS` is empty, list top-level categories from `CATEGORIES.md` and prompt.
