---
version: 0.1.0-draft
name: thin-client-vs-embedded-server
summary: Craft Agents Electron app runs in two modes depending on whether CRAFT_SERVER_URL is set — embedded mode starts server in-process, thin-client mode connects to remote.
category: architecture
tags: [electron, headless-server, thin-client]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: apps/electron/src/main/index.ts
imported_at: 2026-04-18T00:00:00Z
---

# Thin-client vs embedded server mode

The same Electron binary can run in two topologies depending on one env var:

### Embedded mode (default, `CRAFT_SERVER_URL` unset)
- Electron main process starts an in-process `WsRpcServer` on `127.0.0.1:<random>` via `bootstrapServer()` from `@craft-agent/server-core`.
- Renderer connects to that local WebSocket.
- Everything — session manager, SDK subprocess spawning, credential decryption — runs in the Electron main process.
- Single-binary UX: no server to install separately.

### Thin-client mode (`CRAFT_SERVER_URL=wss://example.com:9100 CRAFT_SERVER_TOKEN=... open Craft Agents`)
- Electron skips the embedded bootstrap.
- Renderer connects directly to the remote headless server.
- All session logic, tool execution, LLM calls happen on the server.
- The Electron app is essentially a React UI + file picker + native notifications.
- Ideal for long-running sessions surviving laptop sleep, or running heavy compute on a VPS.

### How mode selection works
Main process reads `process.env.CRAFT_SERVER_URL` at startup:
- Set and valid → don't bootstrap embedded; configure renderer with the remote URL + token.
- Unset or invalid → bootstrap embedded server; pass its random URL + generated token to renderer.

### Shared code path
`@craft-agent/server-core` hosts the RPC handlers, session manager, transport — identical code runs in embedded mode (inside Electron main) and in the standalone `@craft-agent/server` binary. The only variation is `PlatformServices` implementation (see `electron-platform-services-injection` skill).

### Web UI topology
Add to this: if the standalone server has `CRAFT_WEBUI_DIR` set, it also serves a browser UI on the same port with cookie auth. That gives you a THIRD topology: "no Electron, just browser" — most useful for server-admin scenarios.

### Security implication
Tokens are in cleartext over `ws://`. Loopback-only in embedded mode is safe; thin-client MUST use `wss://`. The server explicitly refuses to bind to a non-loopback address without TLS (`--allow-insecure-bind` flag to override).

### Takeaway
One codebase, three topologies, one set of RPC handlers. The split between `server-core` (shared logic) and `server` / Electron main (thin orchestration wrappers) is what makes this practical.
