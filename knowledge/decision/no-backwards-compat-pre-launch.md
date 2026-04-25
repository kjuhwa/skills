---
version: 0.1.0-draft
name: no-backwards-compat-pre-launch
summary: Before a product is live, prefer removing old code paths over preserving old-plus-new behavior — avoid compat layers, dual-write logic, legacy adapters, and temporary shims.
category: decision
tags: [coding-rules, refactor, tech-debt]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLAUDE.md
imported_at: 2026-04-18T00:00:00Z
---

Explicit rule: unless the user asks for backwards compatibility, do not add compatibility layers, fallback paths, dual-write logic, legacy adapters, or temporary shims. If a flow or API is being replaced and the product is not yet live, remove the old path instead of preserving both.

## Why

Shims and fallbacks accumulate; each one adds a branch that must be tested, documented, and eventually removed. Pre-launch, there are no external users to protect, so the cost of "keeping the old one" is paid forever while the benefit is zero. This rule also applies to broad refactors — don't do them unless the task requires it.

Concrete manifestation in the repo: when the auth flow moved from localStorage token to HttpOnly cookie, the old path was removed, not kept as a fallback. When workspace identity moved to URL, the `multica_workspace_id` localStorage key was deleted.

## Evidence

- CLAUDE.md, "Coding Rules" — explicit rule.
- `docs/workspace-url-refactor-proposal.md:88-91` — "唯一的硬中断点：现有的 /issues 等 URL 在重构后会 404" (old routes just 404 after refactor, no redirect).
