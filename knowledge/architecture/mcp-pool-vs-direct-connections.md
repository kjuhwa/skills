---
version: 0.1.0-draft
name: mcp-pool-vs-direct-connections
summary: Why Craft Agents centralizes MCP source connections in a McpClientPool exposed as a single Streamable-HTTP endpoint to SDK subprocesses, instead of letting each subprocess connect independently.
category: architecture
tags: [mcp, pool, subprocess, streamable-http]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/shared/src/mcp/pool-server.ts
imported_at: 2026-04-18T00:00:00Z
---

# MCP pool vs. direct connections

### Problem
Craft Agents has many MCP sources (Linear, GitHub, Notion, Craft docs, custom). It also spawns SDK subprocesses (Codex, Copilot) that each want to call MCP tools. Naive design: each subprocess opens its own stdio / SSE connection to every source. Consequences:
- N sources × M subprocesses = N·M connections, all authenticated, all maintaining session state.
- Credential distribution: every subprocess needs to know every source's token.
- Connection pooling + heartbeat for each is duplicated work.

### Solution: centralized pool + stateless HTTP façade
The main process holds a single `McpClientPool` with one `PoolClient` per source (the real MCP connection). It exposes the aggregated tool list over a local HTTP endpoint (`http://127.0.0.1:<rand>/mcp`) using `StreamableHTTPServerTransport({ sessionIdGenerator: undefined })`.

Each SDK subprocess connects to ONLY that local endpoint. Tool names are namespaced `mcp__<source>__<tool>` so there's no ambiguity on dispatch. The main process fans out each call to the right pool client, aggregates the response, returns it.

### Benefits
- Connections: N + 1 per source (pool has 1, façade serves all subprocesses).
- Credentials never touch subprocess environments — they stay in the main process's credential manager.
- Subprocesses see a single MCP endpoint; simpler config, simpler auth.
- Rate-limit / retry / backoff logic for each real source connection centralized.

### Trade-offs
- Added hop: subprocess → HTTP façade → real MCP → back. Adds latency for local stdio sources. In practice negligible next to LLM call latency.
- Stateless mode rules out resource subscriptions / server-initiated notifications (pool façade can't propagate them). For the repo's use case, tools-only is enough.
- Single point of failure: if the pool dies, all subprocesses lose MCP. Main process crash already loses everything, so this doesn't widen blast radius.

### Where the other approach lives
Session-scoped MCP servers (e.g. `packages/session-mcp-server`) are STILL stdio and spawned per session. Those expose session-specific tools (`SubmitPlan`, `config_validate`) that need session context baked in. The pool is for CROSS-session tools.

### Reference
- `packages/shared/src/mcp/pool-server.ts` — HTTP façade.
- `packages/shared/src/mcp/mcp-pool.ts` — pool + per-source clients.
- `packages/shared/src/mcp/api-source-pool-client.ts` — shim for REST-API sources as PoolClients.
