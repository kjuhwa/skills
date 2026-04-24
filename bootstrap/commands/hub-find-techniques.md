---
description: Search remote hub for techniques (middle-layer composition recipes). Additive to /hub-find — does not modify it.
argument-hint: <keyword> [--category <cat>] [--tag <tag>]
---

# /hub-find-techniques $ARGUMENTS

Keyword search across techniques in `~/.claude/skills-hub/remote/technique/` (when present) and the local drafts at `.technique-draft/` (project scope).

**Why this is separate from `/hub-find`**: the canonical `/hub-find` has not yet been extended with a `technique` kind (see RFC `technique-rfc.md` §5). This command fills the gap **additively** so users can find techniques without waiting on the upstream extension. Once `/hub-find --kind technique` ships, this command can be removed.

## Steps

1. Parse `<keyword>` (required) and optional `--category`/`--tag`.
2. Gather candidate files:
   - `~/.claude/skills-hub/remote/technique/**/TECHNIQUE.md` (remote cache, if the directory exists)
   - `./.technique-draft/**/TECHNIQUE.md` (project scope)
3. For each candidate, parse frontmatter: `name`, `description`, `category`, `tags`, `composes[]`.
4. Match keyword (case-insensitive) against: name, description, tags, and each `composes[].ref`. A hit on an atom's ref means "this technique uses something that matches your keyword" — include with an `[atom-hit]` annotation.
5. Apply `--category`/`--tag` filters.
6. Render top results:
   ```
   STATE    | CATEGORY | NAME                     | ATOMS            | WHY
   draft    | workflow | safe-bulk-pr-publishing  | 2 skill + 2 know | keyword in description
   draft    | debug    | root-cause-to-tdd-plan   | 3 skill + 1 know | [atom-hit] debug/investigate
   ```
7. If no technique directory exists remotely AND no drafts locally, print: "no techniques on this machine — see /hub-sync or author one with /hub-technique-compose".

## Rules

- Read-only. No mutation, no remote fetch.
- If the remote cache lacks a `technique/` directory (current state pre-RFC merge), silently skip that root — do not error.
- Hit ranking: exact name match > tag hit > description hit > atom-ref hit. Stable ordering within ties (alphabetical).

## Relationship to /hub-find

This is a **temporary additive bridge**. Do not duplicate `/hub-find`'s broader search behavior (skills, knowledge, examples). When upstream `/hub-find` learns `--kind technique`, deprecate and remove this command.
