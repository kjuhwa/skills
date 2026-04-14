---
description: List locally installed skills with source and scope
argument-hint: [--global | --project | --orphans]
---

# /skills_list $ARGUMENTS

Report installed skills tracked by the hub registry.

## Steps

1. Read `~/.claude/skills-hub/registry.json` (create as `{}` if missing).
2. Scan:
   - `~/.claude/skills/*/SKILL.md` (global scope)
   - `.claude/skills/*/SKILL.md` if cwd has `.claude/` (project scope)
3. Cross-reference:
   - **Tracked + present**: normal entry → show name, scope, category, source_commit, installed_at.
   - **Tracked + missing**: `[ORPHAN REGISTRY]` — offer to remove from registry.
   - **Untracked + present**: `[UNTRACKED]` — manually authored or pre-hub install.
4. Apply flag filter: `--global`, `--project`, `--orphans`.
5. Render as a clean table grouped by scope.

## Rules

- Read-only unless user approves orphan cleanup.
- If registry is missing, do not panic — just fall back to filesystem scan.
