---
version: 0.1.0-draft
name: english-only-comments
summary: All code comments in English only — keeps the codebase accessible to contributors regardless of native language and plays well with LLM-assisted review.
category: decision
tags: [coding-rules, comments, internationalization, style]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLAUDE.md
imported_at: 2026-04-18T00:00:00Z
---

Rule: code comments are English-only. Planning docs, commit messages, internal Slack, PR discussion may be multilingual; source code comments must not.

## Why

Three reasons:
1. The codebase is open source — non-English comments immediately exclude contributors who don't read that language.
2. LLM-driven code review and refactoring benefits from one language throughout; mixing hurts retrieval quality and grep.
3. A shared language for comments is load-bearing for async remote teams; a PR reviewer should never need to context-switch between languages to understand the diff.

Docs under `docs/` may be whatever language fits the audience (the repo has Chinese planning docs, English architecture docs, etc.) — but code itself stays English.

## Evidence

- CLAUDE.md, "Coding Rules" — explicit rule.
- `docs/workspace-url-refactor-proposal.md` — a Chinese proposal doc alongside English code.
