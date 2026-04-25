---
version: 0.1.0-draft
name: no-formatting-only-changes-rule
type: knowledge
category: development
summary: No automatic code formatters on merge; keep diffs semantic-only unless explicit reformat is requested.
confidence: medium
tags: [changes, development, formatting, only, rule]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: CLAUDE.md
imported_at: 2026-04-19T00:00:00Z
---

# No Formatting Only Changes Rule

## Fact
No automatic code formatters on merge; keep diffs semantic-only unless explicit reformat is requested.

## Why it matters
Prevents review fatigue from churning whitespace diffs.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `CLAUDE.md`
