---
name: skills-hub
description: Central skill/knowledge registry that syncs with kjuhwa/skills.git. Discover, install, extract, publish, and maintain reusable skills across projects. Auto-loads when any /init_skills, /skills_*, /skill_extract, /skill_publish, /skill_finalize command is invoked, or when the user mentions installing skills, publishing skills, syncing the skill repo, or extracting skills from the current project.
user-invocable: false
---

# Skills Hub

Central orchestration layer for the `kjuhwa/skills` knowledge repository.

## Remote Repository

- URL: `https://github.com/kjuhwa/skills.git`
- Clone cache: `~/.claude/skills-hub/remote/` (shallow, auto-refreshed)
- Registry: `~/.claude/skills-hub/registry.json` — tracks installed skills, source path, version, install date

## Remote Layout (category-separated)

```
skills/
  <category>/           # apm, backend, frontend, devops, testing, db, security, ai, ...
    <skill-name>/
      SKILL.md          # frontmatter: name, description, tags, triggers, category, version
      content.md        # prompt / knowledge body
      examples/         # optional
  index.json            # flat catalog built from SKILL.md frontmatter
  CATEGORIES.md         # human-readable category list
  README.md
```

## Local Install Destinations

- **Project-scoped**: `.claude/skills/<skill-name>/` (default when inside a project with `.claude/`)
- **User-scoped**: `~/.claude/skills/<skill-name>/` (fallback, or `--global` flag)

Registry entry format:
```json
{
  "<skill-name>": {
    "category": "apm",
    "source_commit": "a1b2c3",
    "installed_at": "2026-04-14T10:00:00Z",
    "scope": "project|global",
    "version": "1.0.0"
  }
}
```

## Command Map

| Slash Command | Purpose |
|---|---|
| `/init_skills <keyword>` | Search remote by keyword/category → interactive install |
| `/skills_search <keyword>` | Preview-only remote search |
| `/skills_list` | Show installed skills (local + scope + source) |
| `/skills_sync` | Refresh remote cache + update installed skills |
| `/skills_extract` | **Full project scan** → generate skill drafts in `.skills-draft/` |
| `/skills_extract_session` | **Current session only** → drafts from recent changes |
| `/skills_publish` | Review drafts → push to remote as branch + optional PR |
| `/skills_finalize` | End-of-project: extract → review → publish → cleanup drafts |
| `/skills_cleanup` | Remote maintenance: dedupe, re-index, stale removal (dry-run default) |
| `/skills_remove <name>` | Uninstall local skill |

## Safety Rules

1. **Never push directly to `main`** — always a branch `skills/<category>/<name>-<date>`.
2. `publish` and `cleanup` run dry-run first, require explicit user approval before git write operations.
3. `extract` writes to `.skills-draft/` (gitignored by default), never directly to remote.
4. Skill names must match `[a-z0-9-]+`; categories from `CATEGORIES.md` (new ones require explicit approval).
5. Before installing, check registry for name collision; prompt on conflict.

## Extract Heuristics

Only keep patterns that are **generalizable**. Drop project-specific code.

Signals that promote a pattern to a skill draft:
- Appears across multiple files with small variations
- Solves a recurring problem documented in commit messages
- User explicitly corrects behavior (see feedback memory)
- New tool/library integration with non-trivial setup
- Debugging workflow that succeeded after iteration

Signals that demote (skip):
- Contains business names, credentials, internal URLs
- Tied to one-off migration or hotfix
- Reproduces framework defaults

## Metadata Contract (SKILL.md frontmatter)

```yaml
---
name: <kebab-case-name>
description: <one sentence, specific, trigger-friendly>
category: <from CATEGORIES.md>
tags: [list, of, keywords]
triggers: [keyword patterns for auto-activation]
source_project: <originating project name or "manual">
version: 1.0.0
---
```

## Integration Notes

- Works alongside OMC skills — installed skills appear under `~/.claude/skills/` or `.claude/skills/` and are auto-discovered by Claude Code's skill loader.
- Respects `DISABLE_OMC` and `OMC_SKIP_HOOKS`.
- All git operations use `git -C ~/.claude/skills-hub/remote` — never touch the user's project git state.
