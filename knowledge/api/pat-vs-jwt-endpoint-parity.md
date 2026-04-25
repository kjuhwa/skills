---
version: 0.1.0-draft
name: pat-vs-jwt-endpoint-parity
summary: Same API endpoints accept both session JWTs (browser) and personal access tokens (CLI/daemon) — the auth middleware dispatches by prefix and treats the two uniformly downstream.
category: api
tags: [auth, pat, jwt, api-design, cli]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: server/internal/middleware/auth.go
imported_at: 2026-04-18T00:00:00Z
---

Web clients authenticate with short-lived JWT session tokens (via cookie or Authorization header). CLI/daemon authenticates with a long-lived Personal Access Token (PAT). Both hit the same API endpoints — there's no separate `/cli/*` surface.

The auth middleware:
1. Extracts the token from `Authorization: Bearer ...` header or auth cookie.
2. Dispatches by prefix: `mul_` → PAT lookup; else → JWT verify.
3. Both paths resolve to a user ID and inject it as `X-User-ID` in the downstream context.
4. Downstream middleware (workspace, role) no longer cares which kind of token got here.

## Why

Single surface area means CLI features don't fall behind web features — whatever works in the browser works in the CLI automatically. PAT lifetime (e.g. 90 days default) is longer than JWT (hours to days) because CLI/daemon workflows are headless and shouldn't force re-login at inconvenient moments.

Separate PAT + scope model (one PAT per user, named, revocable) makes audit and revocation clean: rotate a leaked token without forcing a full logout everywhere.

## Evidence

- `server/internal/middleware/auth.go` — auth flow (referenced).
- `server/migrations/011_personal_access_tokens.up.sql` — PAT table.
- `CLI_AND_DAEMON.md` — "token login" section.
