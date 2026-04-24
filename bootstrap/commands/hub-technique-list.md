---
description: List locally installed and drafted techniques (skills-hub middle layer)
argument-hint: [--drafts-only | --installed-only] [--category <cat>]
---

# /hub-technique-list $ARGUMENTS

Report techniques (composition recipes) present on disk. Techniques live at:

- **Installed**: `~/.claude/techniques/<category>/<slug>/TECHNIQUE.md`
- **Drafts**: `.technique-draft/<category>/<slug>/TECHNIQUE.md` (project-local)

## Steps

1. Parse args. Default: list both drafts and installed.
2. Scan the two roots:
   - `~/.claude/techniques/**/TECHNIQUE.md`
   - `./.technique-draft/**/TECHNIQUE.md`
3. For each file, read the frontmatter and extract:
   `name`, `version`, `category`, `binding`, `composes[]` (count + kinds), `description`.
4. Cross-reference `~/.claude/skills-hub/registry.json` → `techniques` section (if the key exists in schema v3):
   - Present on disk + tracked → normal row.
   - Present + untracked → `[UNTRACKED]`.
   - Tracked + missing on disk → `[ORPHAN REGISTRY]` (offer removal).
5. Apply filters (`--category`, `--drafts-only`, `--installed-only`).
6. Render as a stable text table:
   ```
   STATE    | CATEGORY | NAME                       | VERSION       | BIND   | COMPOSES
   draft    | workflow | safe-bulk-pr-publishing    | 0.1.0-draft   | loose  | 2 skill + 2 knowledge
   install  | workflow | other-technique            | 1.0.0         | pinned | 3 skill + 1 knowledge
   ```
7. Trailing summary: `<N> drafts, <M> installed`.

## Rules

- Read-only. No registry mutation without explicit user approval.
- If neither root exists, print "no techniques found" — **not** an error.
- When registry lacks the `techniques` key, treat as empty (schema pre-v3 compatibility).
- This is a schema-draft pilot command. When the hub formalizes technique support, this file gets superseded by the canonical one.

## Why exists

The `technique/` layer is the middle tier between atomic skills/knowledge and complete examples. Without a list command, drafts accumulate invisibly.
