---
version: 0.1.0-draft
name: ws-token-never-in-url
summary: Never put auth tokens in WebSocket URL query params — proxies, CDNs, and browser history will log them. Use cookies or first-message auth instead.
category: api
tags: [websocket, auth, security, token, cookie]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: packages/core/api/ws-client.ts
imported_at: 2026-04-18T00:00:00Z
---

Browser WebSocket connections support two safe auth modes:

1. **Cookie mode** — HttpOnly auth cookie is sent automatically with the upgrade request (web clients only; cookies don't carry across origins for desktop/Electron).
2. **First-message auth** — connect unauthenticated, send `{"type":"auth","payload":{"token":"..."}}` as the first frame, server holds the connection in a pre-auth state until it sees that frame (with a short read deadline to kick out clients that never authenticate).

The token must never be placed on the URL as a query string. URLs get logged by TLS-terminating proxies, browser history, server access logs, and CDNs. WebSocket URLs are no exception.

## Why

On the server side, handle the two modes behind one upgrade endpoint: try cookie auth first; if no cookie, upgrade the connection and set a 10-second read deadline on the first frame. Clients distinguish themselves by constructor option (`cookieAuth: true` for web, `false` for desktop/CLI).

Use the same PAT/JWT token-shape rule as HTTP endpoints: check a prefix (`mul_` → PAT lookup, otherwise JWT verify) so there's a single authentication path regardless of transport.

## Evidence

- `packages/core/api/ws-client.ts:30-50` — client never appends token to URL.
- `server/internal/realtime/hub.go:331-400` — `firstMessageAuth` + cookie fast path.
