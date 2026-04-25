---
version: 0.1.0-draft
name: webui-http-handler-composed-with-ws
summary: The WsRpcServer accepts an optional httpHandler that serves the web UI + /api/auth on the SAME port as the WebSocket upgrades — one binding, one certificate, two client kinds authenticated with the same token.
category: architecture
tags: [webui, websocket, http, same-port, jwt]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/server-core/src/webui
imported_at: 2026-04-18T00:00:00Z
---

# WebUI HTTP handler composed onto the WsRpcServer

### Architecture
`bootstrapServer(...)` in `@craft-agent/server-core` accepts an optional `httpHandler`. When present, the underlying Node `http.Server` (or `https.Server`) routes non-upgrade requests to the handler and upgrades matching `Upgrade: websocket` requests to the `WebSocketServer`. Result: browser clients load the UI from `http://host:9100/` and establish a WebSocket to `ws://host:9100/` on the same port.

### Handler components (`packages/server-core/src/webui/`)
- `http-server.ts` — the fetch-like handler; routes static assets, `/api/config`, `/api/auth`, `/api/oauth/callback`, `/api/health`.
- `auth.ts` — JWT signing/verifying, cookie parsing, brute-force rate limiting.
- `node-adapter.ts` — `nodeHttpAdapter(fetch)` converts a Fetch-style handler to a `(req, res) => void` for Node's `http.Server`.

### Auth unification
- Native-app clients pass `Authorization: Bearer <CRAFT_SERVER_TOKEN>` on WS upgrade.
- Browser clients login at `/api/auth/login`, receive an HttpOnly JWT cookie, pass it on subsequent requests AND on WS upgrade via `Cookie` header.
- `validateSessionCookie` callback is plumbed into WsRpcServer so upgrade accepts either credential.

### Exposed env knobs
- `CRAFT_WEBUI_DIR` — path to built Vite dist (`apps/webui/dist`). If empty or missing, handler is not created.
- `CRAFT_WEBUI_PASSWORD` — shorter password for browser login (falls back to server token, but that's 64 hex chars — too long to type).
- `CRAFT_WEBUI_SECURE_COOKIE` — force Secure flag on/off (auto otherwise based on TLS).
- `CRAFT_WEBUI_WS_URL` — override browser's ws target (reverse proxy scenarios).

### Production pattern
Behind nginx / Caddy at :443 doing TLS termination:
- Reverse proxy forwards both HTTP and WS upgrade to the internal server port.
- Server binds to 127.0.0.1:9100, TLS off.
- Set `CRAFT_WEBUI_WS_URL=wss://your-domain.com/` so the browser gets the right ws target from `/api/config`.

### OAuth callback lifecycle
`webuiHandler.setOAuthCallbackDeps({...})` is called AFTER bootstrap (lazy, because OAuth deps include the session manager). The lazy binding lets the HTTP handler be built early (embedded in WsRpcServer options) without circular deps.

### Reference
- `packages/server-core/src/webui/{auth,http-server,node-adapter,index}.ts`
- `packages/server/src/index.ts` — shows the embedding + lazy OAuth deps pattern.
