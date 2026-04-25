---
version: 0.1.0-draft
name: ws-invalidation-not-store-writes
summary: WebSocket event handlers invalidate React Query cache keys — they never write directly to Zustand stores or the cache.
category: arch
tags: [websocket, react-query, invalidation, realtime, state]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: packages/core/realtime/use-realtime-sync.ts
imported_at: 2026-04-18T00:00:00Z
---

Pattern: on every WS event, extract the event prefix, look up a refresh function in a per-prefix map, call `queryClient.invalidateQueries({ queryKey: ... })`. No direct store writes. No optimistic updates driven from WS. No bespoke merging.

```
const refreshMap: Record<string, () => void> = {
  inbox:   () => { const wsId = getCurrentWsId(); if (wsId) qc.invalidateQueries({ queryKey: inboxKeys.all(wsId) }); },
  agent:   () => { const wsId = getCurrentWsId(); if (wsId) qc.invalidateQueries({ queryKey: workspaceKeys.agents(wsId) }); },
  member:  () => { ... },
  workspace: () => qc.invalidateQueries({ queryKey: workspaceKeys.list() }),
  // ...
};
```

Debounce per-prefix to collapse bulk updates (e.g. 50 issue-update events in 100ms → one refetch).

## Why

Cache is the single source of truth. Direct WS→store writes re-introduce the drift that pushing all server state to Query was supposed to prevent. Invalidation is also idempotent: the cache either refetches or ignores (if no subscriber is mounted), so spurious WS events cost nothing.

Precise handlers (per-event-type) are reserved for side effects that cannot be expressed as invalidation: toast notifications, forced navigation, self-check ("did I just delete the workspace I'm viewing?"). Daemon register/deregister events invalidate runtime queries globally; heartbeats are explicitly skipped to avoid excessive refetches.

## Evidence

- `packages/core/realtime/use-realtime-sync.ts:77-180` — `refreshMap` pattern.
- CLAUDE.md, "State Management" hard rules.
