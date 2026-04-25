---
name: full-stack-isolated-dev-env
description: Stand up a fully isolated backend + frontend + daemon dev environment per worktree with scripted auth bootstrap (login + PAT + workspace) for AI/CI workflows.
category: workflow
version: 1.0.0
tags: [dev-env, worktree, isolation, automation, ci]
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: medium
---

## When to use

- AI coding agent or CI workflow that needs a fresh, isolated stack with automated auth (no browser login).
- Multiple feature branches in parallel, each in its own worktree, each fully isolated from production CLI config.

## Steps

1. Compute deterministic profile name from the worktree path:
   ```bash
   WORKTREE_DIR="$(basename "$PWD")"
   SLUG="$(printf '%s' "$WORKTREE_DIR" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g; s/__*/_/g; s/^_//; s/_$//')"
   HASH="$(printf '%s' "$PWD" | cksum | awk '{print $1}')"
   OFFSET=$((HASH % 1000))
   PROFILE="dev-${SLUG}-${OFFSET}"
   ```
   Matches the worktree's port and DB allocation for easy identification.
2. Start the stack:
   ```bash
   make dev
   PORT=$(grep '^PORT=' .env.worktree 2>/dev/null | cut -d= -f2)
   PORT=${PORT:-8080}
   SERVER="http://localhost:${PORT}"
   # wait for /health
   for i in $(seq 1 30); do curl -sf "$SERVER/health" >/dev/null && break; sleep 2; done
   ```
3. Automated auth — dev master code `888888` in non-production:
   ```bash
   curl -s -X POST "$SERVER/auth/send-code" -H "Content-Type: application/json" -d '{"email": "dev@localhost"}'
   JWT=$(curl -s -X POST "$SERVER/auth/verify-code" -H "Content-Type: application/json" -d '{"email": "dev@localhost", "code": "888888"}' | jq -r .token)
   PAT=$(curl -s -X POST "$SERVER/api/tokens" -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" -d '{"name": "auto-dev", "expires_in_days": 365}' | jq -r .token)
   ```
4. Create a workspace:
   ```bash
   WS=$(curl -s -X POST "$SERVER/api/workspaces" -H "Authorization: Bearer $PAT" -H "Content-Type: application/json" -d '{"name": "Dev", "slug": "dev"}' | jq -r .id)
   ```
5. Write per-profile config:
   ```bash
   CONFIG_DIR="$HOME/.myapp/profiles/$PROFILE"
   mkdir -p "$CONFIG_DIR"
   cat > "$CONFIG_DIR/config.json" <<EOF
   {
     "server_url": "$SERVER",
     "app_url": "http://localhost:$FRONTEND_PORT",
     "token": "$PAT",
     "workspace_id": "$WS",
     "watched_workspaces": [{"id": "$WS", "name": "Dev"}]
   }
   EOF
   ```
6. Start the daemon from source with this profile:
   ```bash
   make cli ARGS="daemon start --profile $PROFILE"
   ```
7. Teardown script reverses every step (stop daemon → stop services → optionally stop DB → optionally clean workdirs and profile config).

## Example

Use case: an AI agent needs a working stack to test a code change against. Without scripted auth the agent can't get past the login screen. This recipe lets it come up in ~30s, run a test, and tear down without touching the user's production CLI config or daemon.

## Caveats

- `888888` as master code only works when `APP_ENV != "production"`. Self-host defaults to production; set `APP_ENV=development` in the worktree env for this flow.
- Don't run this recipe against a real server — it creates real users and tokens. Scoped to localhost only.
- Reuse worktree port allocation rather than random ports so the same worktree always comes up on the same URLs (bookmarks, WebSocket reconnect, etc. all survive across days).
