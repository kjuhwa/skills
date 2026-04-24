---
name: jwt-cookie-auth-on-websocket-upgrade
description: Serve a browser-facing web UI that logs in via password, issues an HttpOnly JWT cookie, and then authenticates both subsequent HTTP requests and the WebSocket upgrade from the same cookie — no separate token passing for ws from the browser.
category: security
version: 1.0.0
version_origin: extracted
tags: [websocket, jwt, cookie-auth, webui, jose]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/server-core/src/webui/auth.ts
imported_at: 2026-04-18T00:00:00Z
---

# JWT-cookie auth on WebSocket upgrade

## When to use
- Your server already accepts native-app WebSocket connections with `Bearer` tokens.
- You ALSO want to serve a browser web UI where password login is more natural.
- Don't want the browser to embed a bearer token in JS (xss-reachable) - HttpOnly cookie is safer.

## How it works
1. On `/api/auth/login`: check password (rate-limited per IP), sign a JWT with `jose`:
   ```ts
   new SignJWT({ sub: 'webui' }).setProtectedHeader({ alg: 'HS256' })
     .setIssuedAt(now).setExpirationTime(now + 86400).sign(encoder.encode(SECRET));
   ```
2. Set cookie: `craft_session=<jwt>; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400; Secure` (Secure only when TLS is on; auto-detect via `CRAFT_WEBUI_SECURE_COOKIE` env override).
3. HTTP requests: parse cookie header, `jwtVerify(token, key, { algorithms: ['HS256'] })`, 401 on failure.
4. **WebSocket upgrade**: in `WsRpcServer` options, pass a `validateSessionCookie(cookieHeader): Promise<boolean>`:
   ```ts
   validateSessionCookie: webuiEnabled && serverToken
     ? async (cookieHeader) => (await validateSession(cookieHeader, serverToken)) !== null
     : undefined
   ```
   At upgrade time, the server checks EITHER `Bearer` auth (native clients) OR the cookie (browser clients).
5. Cookie secret = the same server bearer token (`CRAFT_SERVER_TOKEN`) - one secret, two auth mechanisms.
6. Use `CRAFT_WEBUI_PASSWORD` as a shorter password separate from the 32-byte hex server token - users can type it.

## Example
```ts
import { SignJWT, jwtVerify } from 'jose';
const SECRET = new TextEncoder().encode(serverToken);

async function login(password: string) {
  if (password !== env.CRAFT_WEBUI_PASSWORD && password !== env.CRAFT_SERVER_TOKEN)
    throw new Error('bad pw');
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ sub: 'webui' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now).setExpirationTime(now + 86400)
    .sign(SECRET);
}

async function validateSessionCookie(cookieHeader: string | undefined): Promise<boolean> {
  const m = /(?:^|; )craft_session=([^;]+)/.exec(cookieHeader ?? '');
  if (!m) return false;
  try { await jwtVerify(m[1], SECRET, { algorithms: ['HS256'] }); return true; }
  catch { return false; }
}
```

## Gotchas
- HS256 with a single shared secret is fine for a one-binary server; if you later split auth + RPC, you need asymmetric keys.
- `Secure` cookie flag should follow TLS: if listening on `ws://` loopback, omit `Secure` (browsers reject Secure cookies from non-https). Toggle via env.
- Protect `/api/auth/login` with per-IP rate limiting (e.g. 5/min) - password bruteforce is the obvious attack.
- Expose a `CRAFT_WEBUI_WS_URL` env so reverse-proxied deployments can tell the browser to connect to a DIFFERENT host than the page was served from.
- Don't reuse the JWT for cross-site requests - `SameSite=Lax` prevents CSRF on login, `CORS` handles the rest.
