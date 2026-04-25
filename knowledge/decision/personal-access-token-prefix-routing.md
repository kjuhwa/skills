---
version: 0.1.0-draft
name: personal-access-token-prefix-routing
summary: Personal access tokens use a distinct prefix (mul_) so server code can route "is this a PAT or a JWT?" by a cheap string check before parsing.
category: decision
tags: [auth, pat, jwt, token, security]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: server/internal/realtime/hub.go
imported_at: 2026-04-18T00:00:00Z
---

Server accepts two token shapes on the same endpoints:
- **PAT** — opaque random string with a `mul_` prefix, looked up in `personal_access_tokens` table.
- **JWT** — HS256-signed token issued at login, verified with `jwt.Parse`.

Dispatch is a prefix check:

```go
if strings.HasPrefix(tokenStr, "mul_") {
    uid, ok := pr.ResolveToken(ctx, tokenStr)
    if !ok { return "", errInvalid }
    return uid, nil
}
// else JWT path
```

## Why

Without a clear shape distinction, every auth path would have to try both methods (PAT lookup first, JWT verify on miss) — expensive on DB and indistinguishable error messages. Prefix routing lets PAT auth be one DB lookup and JWT auth be pure crypto, no DB.

Choose a short prefix that's unlikely to collide with JWTs in the wild (`eyJ` is the standard JWT header, so anything not starting with `eyJ` is already rare; `mul_` makes it explicit). Document the prefix in the API docs so consumers can pre-identify token shape client-side.

## Evidence

- `server/internal/realtime/hub.go:297-310` — `authenticateToken` dispatches by prefix.
- `server/migrations/011_personal_access_tokens.up.sql` — PAT table.
