---
version: 0.1.0-draft
name: optimistic-mutations-by-default
summary: Mutations apply the change locally, send the request, roll back on failure, invalidate on settle. The user never waits for the server.
category: decision
tags: [react-query, mutations, optimistic-updates, ux]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLAUDE.md
imported_at: 2026-04-18T00:00:00Z
---

Default pattern for every mutation:

1. `onMutate`: snapshot current cache, apply optimistic update, return snapshot as context.
2. `mutationFn`: run server call.
3. `onError`: restore snapshot from context.
4. `onSettled`: invalidate affected query keys.

## Why

For most CRUD on a Linear-style product (status changes, priority, assignee, title edits), server roundtrip is ~100-300ms. Making the user wait that long for every click feels sluggish. Optimistic UI is fast by default; the correctness safety is in `onSettled` invalidation — after every mutation, the cache is refetched from ground truth, so even if the optimistic update was wrong the cache self-heals within one roundtrip.

Combined with WS-driven invalidation, optimistic updates also bridge the gap between "user sees their own mutation" and "other members see it via WS" — both paths end up invalidating the same keys, no special merge logic.

## Evidence

- CLAUDE.md, "State Management" hard rules — "Mutations are optimistic by default".
- `packages/core/workspace/mutations.ts` — example implementations.
