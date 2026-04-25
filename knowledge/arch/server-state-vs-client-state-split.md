---
version: 0.1.0-draft
name: server-state-vs-client-state-split
summary: TanStack Query owns all server state; Zustand owns all client state. Never duplicate server data into a store.
category: arch
tags: [react-query, zustand, state-management, frontend, architecture]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLAUDE.md
imported_at: 2026-04-18T00:00:00Z
---

The architecture relies on a strict split between server state and client state. Mixing them is the most common way to break it.

- TanStack Query owns all server state (issues, users, workspaces, inbox, anything fetched from the API).
- Zustand owns all client state (UI selections, filters, drafts, modal state, navigation history).
- React Context is reserved only for cross-cutting platform plumbing (workspace identity, navigation).

## Why

Duplicating server data into Zustand creates two sources of truth that inevitably drift. Keeping the Query cache as the single source makes WebSocket-driven invalidation coherent: WS events invalidate queries but never write to stores directly, avoiding race conditions.

Workspace-scoped queries must key on `wsId` so workspace switching is automatic — the cache key changes, right data appears, no manual invalidation needed. Mutations are optimistic by default: apply locally, send request, roll back on failure, invalidate on settle.

## Evidence

- CLAUDE.md, "State Management" section.
- `packages/core/query-client.ts` — global query defaults.
- `packages/core/realtime/use-realtime-sync.ts` — all WS event handlers invalidate via `qc.invalidateQueries`, never mutate stores.
