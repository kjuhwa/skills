---
name: visibility-change-cache-refresh
description: Listen for document.visibilitychange and force-invalidate critical React Query keys when the tab becomes visible — a 10-line safety net against silent WebSocket drop-outs.
category: workflow
version: 1.0.0
tags: [react-query, websocket, visibilitychange, cache, freshness]
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

- Your app caches server data with TanStack Query, `staleTime: Infinity`.
- You rely on WebSocket pushes to keep data fresh.
- You're seeing "list is stale after I come back from lunch" reports.

## Steps

1. In your core platform provider (the one that owns the QueryClient), register a `visibilitychange` listener:
   ```tsx
   export function CoreProvider({ children }: { children: ReactNode }) {
     const qc = useMemo(() => createQueryClient(), []);
     useEffect(() => {
       const handler = () => {
         if (document.visibilityState !== "visible") return;
         const wsId = getCurrentWsId();
         if (!wsId) return;
         qc.invalidateQueries({ queryKey: issueKeys.all(wsId) });
         qc.invalidateQueries({ queryKey: inboxKeys.all(wsId) });
         qc.invalidateQueries({ queryKey: workspaceKeys.members(wsId) });
         qc.invalidateQueries({ queryKey: projectKeys.all(wsId) });
       };
       document.addEventListener("visibilitychange", handler);
       return () => document.removeEventListener("visibilitychange", handler);
     }, [qc]);
     return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
   }
   ```
2. Keep the invalidated-key list short — only the lists that the user would actively look at on return. Do not force-refetch every cached query; that's wasteful.
3. Complement with `onReconnect` on your WebSocket client for the "connection was dropped and came back" path. Both paths converge on the same invalidation.
4. Optional: set a finite `staleTime` (e.g. 5 min) as a third safety net if cost is acceptable.

## Example

Scenario fix: User closes the laptop at 6pm, opens it at 9am. TCP connection was silently dropped overnight; WS never reconnects. Without this hook, the UI shows yesterday's data. With it, opening the tab fires `visibilitychange` → critical lists refetch → UI is fresh within a second.

## Caveats

- Don't put this on every component — it's a global concern, belongs in one place.
- `visibilitychange` fires when users switch tabs too, not just on sleep resume. Trivial extra refetches on tab-switch are usually fine; if not, gate on a minimum interval (e.g. "only refetch if last refetch was > 30s ago").
- This is a symptom-level fix. For a root-cause fix, implement application-level heartbeat so the WS client actively detects dead connections and forces reconnect.
