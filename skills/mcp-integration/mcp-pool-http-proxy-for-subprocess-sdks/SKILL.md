---
name: mcp-pool-http-proxy-for-subprocess-sdks
description: Expose a pool of MCP sources (Linear, GitHub, Notion, ...) to Codex/Copilot SDK subprocesses through a single Streamable-HTTP MCP endpoint, instead of having each subprocess open independent connections.
category: mcp-integration
version: 1.0.0
version_origin: extracted
tags: [mcp, streamable-http, subprocess, connection-pool]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/shared/src/mcp/pool-server.ts
imported_at: 2026-04-18T00:00:00Z
---

# MCP pool HTTP proxy for subprocess SDKs

## When to use
- Host process already manages MCP connections to many sources (Linear, GitHub, Notion, ...).
- You spawn LLM SDK subprocesses (Codex, Copilot) that themselves consume MCP tools.
- You do NOT want each subprocess re-establishing stateful stdio/SSE connections to every source.
- Want stateless HTTP so multiple subprocesses can share the pool with no session tracking.

## How it works
1. In the host (e.g. Electron main), keep an `McpClientPool` of `PoolClient` instances — one per source, each holding the real `@modelcontextprotocol/sdk` client.
2. Stand up a local HTTP server on `127.0.0.1:0` (random port).
3. Wrap it with `StreamableHTTPServerTransport({ sessionIdGenerator: undefined })` — **stateless mode**, no session affinity.
4. Connect an `@modelcontextprotocol/sdk/server` `Server` to the transport; register `ListToolsRequestSchema` (fan-out to the pool, namespaced tool names) and `CallToolRequestSchema` (dispatch back).
5. Route every incoming request at `/mcp` to `transport.handleRequest(req, res)` regardless of HTTP method.
6. Return the URL `http://127.0.0.1:<port>/mcp` to each spawned SDK subprocess as its MCP endpoint.
7. Subprocess uses `StreamableHTTPClientTransport(new URL(url))` to talk to the pool.

## Example
```ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

this.transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
this.mcpServer = new Server({ name: 'pool', version: '1.0.0' }, { capabilities: { tools: {} } });
this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = [];
  for (const [slug, client] of this.pool.entries()) {
    const list = await client.listTools();
    tools.push(...list.map(t => ({ ...t, name: `mcp__${slug}__${t.name}` })));
  }
  return { tools };
});
this.mcpServer.setRequestHandler(CallToolRequestSchema, async (req) => {
  const [, slug, tool] = req.params.name.split('__');
  return this.pool.get(slug).callTool(tool, req.params.arguments);
});
await this.mcpServer.connect(this.transport);
http.createServer((req, res) => this.transport.handleRequest(req, res)).listen(0, '127.0.0.1');
```

## Gotchas
- Stateless mode means DO NOT use `session/notifications` or resource subscriptions - they all need a session ID.
- Bind to `127.0.0.1` only - the SDK subprocess shares your localhost so no need to open a port publicly.
- Namespace tool names aggressively (`mcp__<source>__<tool>`) so collisions between sources don't silently shadow each other.
- `transport.handleRequest` covers POST, GET, DELETE - route them all to it; don't try to branch on method.
