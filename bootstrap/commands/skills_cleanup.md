---
description: Maintain the remote skill repo — dedupe, re-index, remove stale entries
argument-hint: [--apply] [--dedupe] [--reindex] [--stale-days=<n>]
---

# /skills_cleanup $ARGUMENTS

Remote repository maintenance. **Dry-run is the default.**

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
