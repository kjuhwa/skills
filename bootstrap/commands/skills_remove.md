---
description: Uninstall a locally installed skill
argument-hint: <skill-name> [--scope=project|global]
---

# /skills_remove $ARGUMENTS

Remove a skill from local install.

## Steps

1. **Resolve scope**
   - `--scope=project` → `.claude/skills/<name>/`
   - `--scope=global` → `~/.claude/skills/<name>/`
   - No flag: check registry.json; if ambiguous (installed in both), ask.

2. **Confirm** — show SKILL.md frontmatter and target path, ask user to confirm delete.

3. **Delete** the skill directory and remove its registry entry.

4. **Report** result + suggest `/skills_list` to verify.

## Rules

- Never delete untracked skills without extra confirmation ("this skill isn't in the registry — delete anyway?").
- Never touch remote.
- If skill has a `.bak` file from a prior sync, preserve it (user may want rollback).
