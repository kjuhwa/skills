---
description: Show a technique's frontmatter, body, and expanded composition (inline descriptions of referenced skills/knowledge)
argument-hint: <slug> [--raw]
---

# /hub-technique-show $ARGUMENTS

Display one technique with its composition expanded in-place — so the reader can judge the recipe without jumping across 4+ files.

## Input resolution

Same as `/hub-technique-verify`: first match in `./.technique-draft/**/<slug>/TECHNIQUE.md`, then `~/.claude/techniques/**/<slug>/TECHNIQUE.md`.

## Steps

1. Read the technique file.
2. Print the frontmatter block verbatim.
3. For each `composes[]` entry:
   - Resolve the path:
     - `kind: skill` → `~/.claude/skills-hub/remote/skills/<ref>/SKILL.md`
     - `kind: knowledge` → `~/.claude/skills-hub/remote/knowledge/<ref>.md`
   - Read the referenced file's frontmatter → extract `name`, `version`, `description` (or `summary` for knowledge).
   - Print one-line annotated entry:
     ```
     [skill] parallel-build-sequential-publish v1.0.0  (role: orchestrator)
             → Build multiple independent projects in parallel... then publish ... sequentially
     ```
   - If the ref resolves to a missing file, mark `[MISSING]` in red equivalent and continue.
4. Print the technique body verbatim (everything after frontmatter).
5. Trailing status line: `<N> atoms resolved, <M> missing`.

## Flags

- `--raw`: skip composition expansion; print the file as-is. Use when you want the exact authoring content without enrichment.

## Rules

- Read-only.
- Never modify the technique. For edits, open the file directly.
- Never fetch remote. If atom files are missing, the show command surfaces that fact — does not try to `/hub-sync`.

## Why exists

A technique's value is in its **composition** — but the composition is references, not content. Reading the technique alone tells you "uses X and Y"; this command also tells you what X and Y *are*, so you can evaluate the recipe in one screen.
