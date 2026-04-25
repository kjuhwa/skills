---
version: 0.1.0-draft
name: websocket-half-open-stale-cache
summary: Browser WebSocket has no ping/pong API, so half-open TCP connections leave readyState=OPEN while events are silently dropped, causing stale query caches.
category: pitfall
tags: [websocket, react-query, stale-cache, heartbeat, browser]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: HANDOFF_ARCHITECTURE_AUDIT.md
imported_at: 2026-04-18T00:00:00Z
---

If your UI relies on WebSocket pushes to invalidate a React Query cache configured with `staleTime: Infinity` and `refetchOnWindowFocus: false`, you have a correctness bug whenever the TCP connection is silently dropped (NAT timeout, laptop sleep, flaky LB). Server-side ping/pong will detect the dead client, but the browser JS layer cannot — the native WebSocket API does not expose ping/pong frames. The browser sees `readyState === OPEN`, no `onclose` fires, the reconnect timer never runs, and all events arriving during the outage go into a black hole. The cache silently rots until the user logs out and back in.

## Why

This is not a Multica bug per se; it's a property of the browser WebSocket spec. Any "WS-only cache freshness" strategy is unsound. Three layered mitigations, from cheapest to most thorough:

1. Listen for `visibilitychange` and force-invalidate critical queries when the tab becomes visible again. ~10 lines; catches most sleep/background-tab cases.
2. Implement application-level heartbeat: server sends a periodic JSON "heartbeat" message; client tracks `lastMessageTime` and closes the socket if it exceeds N seconds. Triggers the existing reconnect path.
3. Set a finite `staleTime` (e.g. 5 min) or enable `refetchOnWindowFocus: true` as a third safety net.

Blocking the WS URL in DevTools does NOT reproduce this — that triggers `onclose`. A true repro requires packet-layer silent drop (macOS `pfctl`, Linux `iptables`).

## Evidence

- `HANDOFF_ARCHITECTURE_AUDIT.md` Task 1 — full root cause write-up.
- `packages/core/query-client.ts:5-12` — `staleTime: Infinity`, `refetchOnWindowFocus: false`.
- `packages/core/api/ws-client.ts` — client has no heartbeat; relies solely on `onclose`.
- `server/internal/realtime/hub.go:87-99` — server has 54s ping / 60s pongWait (asymmetric with client).
