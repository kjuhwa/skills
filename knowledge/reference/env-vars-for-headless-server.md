---
version: 0.1.0-draft
name: env-vars-for-headless-server
summary: Complete environment-variable contract for the craft-agents headless server binary (CRAFT_SERVER_TOKEN, RPC host/port, TLS triple, web UI toggles, debug).
category: reference
tags: [server, env-vars, configuration, headless]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/server/src/index.ts
imported_at: 2026-04-18T00:00:00Z
---

# Headless server env vars

The `@craft-agent/server` binary is configured entirely via env vars (no config file). Full contract, from `packages/server/src/index.ts`:

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `CRAFT_SERVER_TOKEN` | yes | — | Bearer token for WebSocket auth. Generate with `--generate-token` or `openssl rand -hex 32`. |
| `CRAFT_RPC_HOST` | no | `127.0.0.1` | Bind address. `0.0.0.0` for remote access (requires TLS). |
| `CRAFT_RPC_PORT` | no | `9100` | Bind port. `0` = OS chooses. |
| `CRAFT_RPC_TLS_CERT` | no | — | PEM cert path; setting enables `wss://`. |
| `CRAFT_RPC_TLS_KEY` | no | — | PEM key path; required alongside cert. |
| `CRAFT_RPC_TLS_CA` | no | — | Optional PEM CA chain for client cert verification. |
| `CRAFT_APP_ROOT` | no | cwd | Application root path. |
| `CRAFT_RESOURCES_PATH` | no | `<cwd>/resources` | Resources path. |
| `CRAFT_IS_PACKAGED` | no | `false` | `true` for production (e.g. inside Electron bundle). |
| `CRAFT_VERSION` | no | package version | Reported in `system:versions`. |
| `CRAFT_DEBUG` | no | `false` | `true`/`1` enables debug logging. |
| `CRAFT_BUNDLED_ASSETS_ROOT` | no | repo root | Where docs / themes / tool-icons are served from. |
| `CRAFT_WEBUI_DIR` | no | — | If set (and exists), serve the web UI on the RPC port. |
| `CRAFT_WEBUI_PASSWORD` | no | `CRAFT_SERVER_TOKEN` | Shorter password for browser login. |
| `CRAFT_WEBUI_SECURE_COOKIE` | no | auto | Override the Secure cookie flag (true/false/1/0/on/off/...). |
| `CRAFT_WEBUI_WS_URL` | no | auto | Browser-facing `ws://` or `wss://` URL when behind a reverse proxy. |
| `CRAFT_HEALTH_PORT` | no | `0` (off) | Separate HTTP health endpoint port. |
| `CLAUDECODE` | - | — | STRIPPED by `apps/cli/src/server-spawner.ts` before spawning (SDK nesting guard). |

### Invocation examples
```bash
# Local dev, TLS off
CRAFT_SERVER_TOKEN=$(openssl rand -hex 32) bun run packages/server/src/index.ts

# Remote access with TLS
CRAFT_SERVER_TOKEN=<tok> CRAFT_RPC_HOST=0.0.0.0 \
  CRAFT_RPC_TLS_CERT=certs/cert.pem CRAFT_RPC_TLS_KEY=certs/key.pem \
  bun run packages/server/src/index.ts

# With web UI on same port
CRAFT_SERVER_TOKEN=<tok> CRAFT_WEBUI_DIR=apps/webui/dist \
  bun run packages/server/src/index.ts
```

### Refuse-insecure-bind semantics
Server refuses to start on a non-loopback host without TLS. Override with CLI flag `--allow-insecure-bind` (not an env var — intentionally annoying to set accidentally).

### `--generate-token`
Pass `--generate-token` to print a crypto-random token and exit. Convenient for first-run bootstrap.

### Docker
Dockerfile.server sets sensible defaults: `CRAFT_RPC_HOST=0.0.0.0`, `CRAFT_RPC_PORT=9100`, `CRAFT_WEBUI_DIR=/app/apps/webui/dist`, `CRAFT_BUNDLED_ASSETS_ROOT=/app/apps/electron`.
