---
version: 0.1.0-draft
name: slug-first-id-fallback-resolver
summary: Resolve multi-tenant identity from slug first (header or query), fall back to UUID for CLI/daemon/legacy clients, collapse "invalid slug" distinctly from "no identifier" for proper 400 vs 404 responses.
category: api
tags: [multi-tenancy, middleware, resolver, slug, uuid]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: server/internal/middleware/workspace.go
imported_at: 2026-04-18T00:00:00Z
---

Single resolver, stable priority order:

1. Middleware-injected context (fast path for already-resolved routes).
2. `X-Workspace-Slug` header → `GetWorkspaceBySlug` → UUID.
3. `?workspace_slug=` query → same.
4. `X-Workspace-ID` header (CLI/daemon compat).
5. `?workspace_id=` query (CLI/daemon compat).

Return three distinguishable outcomes: `(uuid, nil)` success, `("", nil)` for "no identifier at all" (respond 400), `("", errWorkspaceNotFound)` for "slug provided but not a workspace" (respond 404). Do not collapse the last two into the same sentinel — clients need different retry behavior.

## Why

During a slug-first refactor, CLI and daemon remain on UUIDs for a long time. A handler that only accepts slugs breaks them. A handler that only accepts UUIDs blocks the frontend migration. A single resolver that tries slug first and falls back to UUID lets both worlds coexist without per-route branching.

The slug→UUID lookup is a hot path on every authenticated request; slugs are immutable, so a short-TTL cache is safe (not yet implemented; noted as TODO).

## Evidence

- `server/internal/middleware/workspace.go:47-125` — `ResolveWorkspaceIDFromRequest` and `resolveWorkspaceUUID`.
- `server/internal/middleware/workspace.go:170-216` — middleware surface.
