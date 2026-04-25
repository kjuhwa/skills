---
version: 0.1.0-draft
name: workspace-slug-in-url-refactor
summary: Make the URL the single source of truth for multi-tenant workspace context — not a header, not a store, not localStorage.
category: decision
tags: [multi-tenancy, url, routing, workspace, architecture]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: docs/workspace-url-refactor-proposal.md
imported_at: 2026-04-18T00:00:00Z
---

Carrying workspace identity in an `X-Workspace-ID` header plus a Zustand store plus localStorage produces three class of bugs that don't go away one-by-one: shared links open in the wrong workspace, mobile has no in-URL switcher, multiple tabs clobber each other via the single localStorage key, and creating/deleting a workspace races with mutation-side-effect callbacks. Industry practice (Linear, Notion, Vercel, GitHub) is `/{workspace-slug}/...`.

Principle: URL is the single source of truth for workspace context. Switching workspace becomes pure navigation (`<Link href="/{new-slug}/issues">`), not an imperative `switchWorkspace()` call. That single change kills a whole family of mutation-`onSuccess` race bugs.

## Why

Pre-refactor data already supported it: `workspace.slug TEXT UNIQUE NOT NULL`, `GetWorkspaceBySlug` query, slug on the TS `Workspace` type. The refactor was mostly frontend routing + state-cleanup work (~30-35 files, mostly mechanical path-builder substitution). One PR because middle states don't run (URL structure is an atomic change); tradeoff is that existing bookmarks break, accepted because product not yet shipped.

Server side resolves slug-first with header/query fallbacks for CLI and daemon back-compat. Reserved-slug list (`login`, `api`, `issues`, `settings`, etc.) must be kept in sync between frontend and backend to prevent user-chosen slugs from colliding with top-level routes.

## Evidence

- `docs/workspace-url-refactor-proposal.md` — full proposal.
- `server/internal/middleware/workspace.go:47-125` — slug-first resolver with UUID fallback.
- `packages/core/paths/reserved-slugs.ts` — reserved-slug list with rationale per segment.
