---
description: Analyze the full project for reusable patterns and generate skill drafts
argument-hint: [--scope=all|src|docs] [--max=<n>]
---

# /skills_extract $ARGUMENTS

Scan the entire project and draft skills for generalizable knowledge.

## Preconditions

- Must be inside a project directory.
- Ensure `.skills-draft/` exists; add it to `.gitignore` if not already.

## Steps

1. **Gather signals** (in parallel where possible)
   - `git log --oneline -100` → recurring themes in commit messages
   - File tree summary: top directories, file counts by extension
   - `CLAUDE.md` / `AGENTS.md` / `README.md` content if present
   - Package manifests: `package.json`, `pom.xml`, `requirements.txt`, `go.mod`, etc.
   - Memory files in `~/.claude/projects/<project>/memory/` if present

2. **Delegate deep analysis**
   - Spawn `oh-my-claudecode:explore` with `thoroughness=very thorough` to find:
     - Custom patterns/abstractions that recur (≥3 occurrences)
     - Non-obvious setup steps (env vars, CLI flags, build tricks)
     - Recurring debugging workarounds (search for "workaround", "hack", "FIXME")
     - Integration glue (API adapters, auth flows, job scheduling) with generalizable shape

3. **Filter** per `skills-hub` extract heuristics
   - **Keep**: generalizable shapes, domain-agnostic patterns, reusable workflows
   - **Drop**: business names, credentials, one-off fixes, framework defaults

4. **Draft** each candidate at `.skills-draft/<category>/<skill-name>/`
   - Auto-assign category from remote `CATEGORIES.md` (create proposal file `.skills-draft/_new-categories.md` if none fit — requires user approval later).
   - `SKILL.md` with full frontmatter (name, description, category, tags, triggers, source_project = current project name, version = 0.1.0-draft).
   - `content.md` with: problem, pattern, example (sanitized), when to use, pitfalls.

5. **Report**
   - List drafted skills with path, proposed category, one-line description.
   - Tell user to review then run `/skills_publish` to push.

## Rules

- Never touch files outside `.skills-draft/`.
- Sanitize: strip absolute paths, emails, tokens, internal hostnames.
- Cap at `--max=<n>` drafts (default 10) to keep review tractable.
- If a similar-named skill already exists remotely, add `_DUPLICATE_CHECK.md` note in the draft folder.
