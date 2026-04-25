---
name: ws-query-invalidation-bridge
description: Convert WebSocket events into TanStack Query cache invalidations via a per-event-prefix map, so realtime updates never touch stores directly.
category: websocket
version: 1.0.0
tags: [websocket, react-query, invalidation, realtime, pattern]
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

## When to use

- Your UI caches API data with TanStack Query.
- A WebSocket pushes fine-grained events (`issue:created`, `member:removed`, etc.).
- You want realtime freshness without bespoke per-event merging.

## Steps

1. Extract the event-type prefix (`issue:created` → `issue`) and look up a refresh function in a map:
   ```ts
   const refreshMap: Record<string, () => void> = {
     issue:   () => qc.invalidateQueries({ queryKey: issueKeys.all(wsId) }),
     member:  () => qc.invalidateQueries({ queryKey: workspaceKeys.members(wsId) }),
     agent:   () => qc.invalidateQueries({ queryKey: workspaceKeys.agents(wsId) }),
     project: () => qc.invalidateQueries({ queryKey: projectKeys.all(wsId) }),
     pin:     () => qc.invalidateQueries({ queryKey: pinKeys.all(wsId, userId) }),
   };
   ```
2. Wire one `onAny` handler that dispatches:
   ```ts
   useEffect(() => {
     if (!ws) return;
     const off = ws.onAny((msg) => {
       const prefix = msg.type.split(":")[0];
       const refresh = refreshMap[prefix];
       if (refresh) debouncedRefresh(prefix, refresh);
     });
     return off;
   }, [ws]);
   ```
3. Per-prefix debounce to coalesce bursts (e.g. bulk update of 50 issues in 100ms → one refetch):
   ```ts
   const pending = new Map<string, ReturnType<typeof setTimeout>>();
   function debouncedRefresh(key: string, fn: () => void) {
     if (pending.has(key)) clearTimeout(pending.get(key)!);
     pending.set(key, setTimeout(() => { fn(); pending.delete(key); }, 75));
   }
   ```
4. Keep precise per-event handlers ONLY for side effects that can't be expressed as invalidation: toast messages, forced navigation, self-checks ("was I just removed from this workspace?"). Never put data mutation in those handlers.
5. On reconnect, invalidate everything in one pass via `ws.onReconnect(() => qc.invalidateQueries())` so you catch anything you missed during the outage.

## Example

Before a bulk import from another user mints 200 issue-create events in 2 seconds:
- Without debounce: 200 invalidations, each triggers a refetch, UI glitches.
- With debounce: ~3 invalidations over 2s, smooth.

## Caveats

- Skip heartbeat-shaped events explicitly (`if (msg.type === "heartbeat") return;`) or they'll keep refetching forever.
- Invalidate globally (no `wsId`) only for workspace-list / user-level queries; all workspace-scoped keys must use the current `wsId`.
- Do not write to Zustand stores from the WS handler — one of the invariants this pattern preserves.
