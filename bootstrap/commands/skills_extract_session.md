---
description: Extract skill drafts from only the current session's changes
argument-hint: [--since=<ref>] [--include-conversation]
---

# /skills_extract_session $ARGUMENTS

Narrow-scope extraction: only what happened in this session.

## Steps

1. **Determine session scope**
   - Default: `git diff --name-only HEAD` + uncommitted changes (`git status --porcelain`)
   - `--since=<ref>`: use `git diff --name-only <ref>..HEAD` instead
   - If not a git repo: use files modified within the last 6 hours (mtime)

2. **Context signals**
   - Recent commits: `git log --oneline --since="6 hours ago"` (or `$REF..HEAD`)
   - Current session's conversation is already in context — analyze it directly for:
     - User corrections / feedback patterns
     - Problems that took multiple iterations
     - New tool usage or novel combinations
   - `--include-conversation` flag: also mine the conversation transcript for workflow skills (not just code)

3. **Filter + draft** (same heuristics as `/skills_extract`)
   - Output to `.skills-draft/session-<YYYYMMDD-HHMM>/<category>/<skill-name>/`
   - Prefix skill names with session timestamp to avoid collision with full-scan drafts

4. **Report**
   - List drafts + quick preview.
   - Suggest next step: review → `/skills_publish`.

## Rules

- Keep tight focus: fewer, higher-quality drafts > many generic ones.
- Prefer workflow/process skills here (full-scan favors code patterns).
- Sanitize identically to full extract.
