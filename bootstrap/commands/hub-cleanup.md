---
description: Maintain the remote skill repo — dedupe, re-index, remove stale entries
argument-hint: [--apply] [--dedupe] [--reindex] [--stale-days=<n>]
---

# /hub-cleanup $ARGUMENTS

Remote repository maintenance. **Dry-run is the default.**

## Execution strategy (v2.6.1+)

Bulk scanning MUST be delegated to an `Explore` subagent. The main thread only synthesises drafts from the returned candidate list.

```
Agent(
  subagent_type="Explore",
  description="<short task name>",
  prompt="""
Scan ~/.claude/skills-hub/remote/ for integrity issues:
  stale: entries with no updates in 180+ days AND flagged as low-confidence
  orphan_registry: registry.json entries with no matching file on disk
  broken_links: linked_skills/linked_knowledge references to missing slugs
  malformed_frontmatter: missing required fields (name, category, version)
Return findings grouped by category with file paths.

Return a ranked list (top N per `--max-*` flag or sensible default) with: name, kind (skill|knowledge), category, 1-line description, source path(s), confidence. Drop anything project-specific or non-generalizable.
""",
)
```

After the subagent returns, read **only** the few MDs needed to write final drafts. Do **not** iterate `Read` across dozens of files in the main thread — it burns tokens, fragments history, and produces no better result than delegation. (v2.6.1 added this rule after a `/hub-import` run did 73 tool calls to scan one repo.)


## Steps

1. **Refresh cache** to latest `main`.

2. **Checks** (each produces a report section)
   - **Malformed SKILL.md**: missing required frontmatter fields.
   - **Orphans**: skill directory without SKILL.md, or content.md missing.
   - **Duplicates**: skills with ≥80% description similarity or identical name across categories.
   - **Stale**: no commits touching the skill in `--stale-days=<n>` (default 365). Mark for review, don't auto-delete.
   - **Index drift**: `index.json` doesn't match actual SKILL.md files.
   - **Category violations**: category field not in `CATEGORIES.md`.

3. **Propose fixes**
   - Dedupe: suggest merge target, show diff.
   - Reindex: regenerate `index.json`.
   - Malformed: list fields to add.
   - Category violations: propose new category or reassignment.

4. **Apply** (only with `--apply` AND per-item confirmation)
   - Create branch `skills/cleanup-<YYYYMMDD>`.
   - Commit fixes atomically (one commit per category of fix).
   - Push branch, open PR if `gh` available.

## Rules

- **No `--apply` = no writes.** Always report-only by default.
- **Never delete** a stale skill automatically — always PR for human review.
- **Never force-push.**
- Keep the cleanup branch separate from any feature branches.
