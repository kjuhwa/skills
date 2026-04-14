---
description: End-of-project wrap-up — extract, review, publish, and clean up drafts
argument-hint: [--scope=session|full] [--auto-pr]
---

# /skills_finalize $ARGUMENTS

Compose the full project-close flow in one command.

## Steps

1. **Confirm intent** — show the plan and ask to proceed.
   - "About to extract → review → publish skills from this project. Continue?"

2. **Extract**
   - `--scope=session` (default): run `/skills_extract_session --include-conversation`
   - `--scope=full`: run `/skills_extract`

3. **Interactive review**
   - Walk through each draft: display, ask keep/edit/drop.
   - For "edit", open a focused edit loop (user describes change → apply → re-show).

4. **Publish**
   - Run `/skills_publish --all` with approved drafts only.
   - `--auto-pr` forwards `--pr` flag.

5. **Cleanup**
   - Move `.skills-draft/_published/` to a dated archive: `.skills-draft/_archive-<YYYYMMDD>.tar.gz` (or simple rename if no tar).
   - Suggest adding entry to project's CHANGELOG/README referencing published skills.

6. **Post-report**
   - Summary: N extracted, M published, branch URL, PR URL (if any).
   - Reminder: run `/skills_sync` in other projects to pick up new skills.

## Rules

- Fully interactive — no silent operation at any stage.
- If any step fails, stop and preserve state (don't roll back partial publish).
