---
version: 0.1.0-draft
name: websocket-as-execution-boundary-in-desktop-and-web
summary: T3 Code uses WebSocket as the clean architectural boundary between browser/desktop UI and server runtime (git, providers, terminals)
type: knowledge
category: architecture
confidence: high
tags: [architecture, websocket, boundary, separation-of-concerns]
source_type: extracted-from-git
source_url: https://github.com/pingdotgg/t3code.git
source_ref: main
source_commit: 9df3c640210fecccb58f7fbc735f81ca0ee011bd
source_project: t3code
imported_at: 2026-04-18
evidence:
  - .docs/architecture.md
  - .docs/provider-architecture.md
  - .docs/remote-architecture.md
---

## Fact
T3 Code splits cleanly at the WebSocket protocol layer. All client-side code (React web app, Electron renderer) communicates with a Node.js server exclusively via typed WebSocket RPC. The server owns all stateful runtime: provider sessions, git operations, checkpoints, orchestration events, terminal processes, and workspace filesystem access.

## Why it matters
This boundary enables:
1. **Desktop and web to share codebase** — both render the same React UI and speak the same WebSocket protocol
2. **Remote access without rewrite** — the client can connect to a server over SSH, TLS, or local LAN without changing server code
3. **Deterministic testing** — server-side async work can be fully controlled via `drain()` without timing races
4. **Clear contracts** — payload schemas are defined once, validated at boundary, and enforced at compile time
5. **Stateless clients** — clients are ephemeral; all durable state lives on the server (git refs, events, checkpoints)

## Evidence
- Architecture docs show three distinct layers: Browser (React + Vite + WsTransport), Server (orchestration + services), Provider (codex app-server)
- WebSocket methods are schema-defined in `packages/contracts/src/rpc.ts`, not ad-hoc
- Both `apps/desktop/src` and `apps/web/src` import the same `wsTransport.ts` and `localApi.ts`
- Remote architecture doc explicitly states: "Keep the T3 server as the execution boundary"

## How to apply
- When designing new features, ask: "Does this belong on client or server?" If it's durable (state, history, side effects), it belongs on server and exposes a method via WebSocket
- Never let client code directly mutate server state; always route through RPC
- Define new RPC methods as schema-first in contracts, not as post-hoc API routes
- For desktop-specific features (auto-update, app menu), keep that logic in Electron main process but communicate with server via same WebSocket protocol
