---
name: ws-cookie-or-first-message-auth
description: Dual-path WebSocket auth — HttpOnly cookie for browsers, first-message JSON frame for headless clients — with no tokens in the URL.
category: websocket
version: 1.0.0
tags: [websocket, auth, cookie, token, security]
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

- Same backend serves both a web browser (with HttpOnly cookie) and a native/CLI client (with bearer token).
- You care about not leaking tokens into proxy/CDN logs or browser history.

## Steps

1. Client — never put the token in the URL. Put only the workspace/channel identifier:
   ```ts
   const url = new URL(baseUrl);
   url.searchParams.set("workspace_slug", slug);
   this.ws = new WebSocket(url.toString());
   this.ws.onopen = () => {
     if (this.cookieAuth) return;  // cookie auto-sent by browser
     this.ws.send(JSON.stringify({ type: "auth", payload: { token: this.token } }));
   };
   this.ws.onmessage = (e) => {
     const msg = JSON.parse(e.data);
     if (msg.type === "auth_ack") { this.onAuthenticated(); return; }
     // ... normal message routing
   };
   ```
2. Server — try cookie first (fast path for web), fall back to first-message for everyone else:
   ```go
   var userID string
   if cookie, err := r.Cookie(authCookieName); err == nil && cookie.Value != "" {
       uid, msg := authenticateToken(cookie.Value, pr, r.Context())
       if msg != "" { http.Error(w, msg, 401); return }
       if !mc.IsMember(ctx, uid, workspaceID) { http.Error(w, "not a member", 403); return }
       userID = uid
   }
   conn, err := upgrader.Upgrade(w, r, nil)
   if err != nil { return }
   if userID == "" {
       conn.SetReadDeadline(time.Now().Add(10 * time.Second))
       _, raw, err := conn.ReadMessage()
       conn.SetReadDeadline(time.Time{})
       // parse {"type":"auth","payload":{"token":"..."}}
       // validate, check membership, send auth_ack
   }
   ```
3. Accept multiple token shapes through one path — prefix distinguishes JWT from PAT:
   ```go
   if strings.HasPrefix(token, "mul_") { /* PAT lookup */ } else { /* JWT parse */ }
   ```
4. Send an `auth_ack` response so the client knows when to run its "after auth" callbacks (query invalidations, subscription registrations).

## Example

Flow for web (cookie mode):
```
C → GET /ws?workspace_slug=my-team   (Cookie: auth=eyJhbGci...)
S → 101 Switching Protocols
S → { "type": "auth_ack" }
C → queries start subscribing
```

Flow for desktop (token mode):
```
C → GET /ws?workspace_slug=my-team   (no cookie)
S → 101 Switching Protocols
C → { "type": "auth", "payload": { "token": "..." } }
S → { "type": "auth_ack" }
```

## Caveats

- The 10-second first-message deadline is important; without it, an unauthenticated connection can sit idle forever.
- Origin check is still required — `checkOrigin` runs before the upgrade and rejects connections from disallowed `Origin` headers.
- For cookie mode, ensure `SameSite=Lax` or `Strict` + cross-subdomain cookie scope (`Domain=.example.com`) matches where the WS endpoint lives.
