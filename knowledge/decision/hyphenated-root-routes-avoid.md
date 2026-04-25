---
version: 0.1.0-draft
name: hyphenated-root-routes-avoid
summary: Never add hyphenated word-group root routes like /new-workspace — they collide with common user workspace names and force endless reserved-slug audits.
category: decision
tags: [routing, url-design, naming]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLAUDE.md
imported_at: 2026-04-18T00:00:00Z
---

For multi-tenant apps that use `/{workspace-slug}/...` as the URL shape, new global (pre-workspace) routes MUST be either a single word (`/login`, `/inbox`) or a `/{noun}/{verb}` pair (`/workspaces/new`). Hyphenated word-group root routes (`/new-workspace`, `/create-team`) are banned.

## Why

A slug `new-workspace` is a plausible user name for a workspace. If you reserve `/new-workspace` as a global route, you have to add that string to the reserved-slug list, and you have to repeat the audit every time anyone adds a new top-level route. Reserving the noun (`workspaces`) automatically protects the entire `/workspaces/*` subtree with no per-verb maintenance.

Keep the reserved list tight: auth words, platform routes, dashboard segments, RFC 2142 mailboxes (`postmaster`, `abuse`, `noreply`), hostname confusables (`mail`, `ftp`, `cdn`), and framework-mandated segments (`_next`, `.well-known`). Document the category for each entry so future editors understand why.

## Evidence

- CLAUDE.md, "Coding Rules" — the hyphenated-root-route ban.
- `packages/core/paths/reserved-slugs.ts:1-93` — categorized reserved-slug list.
