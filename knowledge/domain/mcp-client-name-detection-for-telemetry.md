---
version: 0.1.0-draft
name: mcp-client-name-detection-for-telemetry
summary: Detect which MCP client connected (Claude Code, Gemini CLI, Codex, Antigravity, OpenClaw, your own CLI) by lowercasing `server.getClientVersion().name` and matching substrings on `oninitialized`, then tag telemetry with that enum for per-client analytics.
category: domain
confidence: medium
tags: [mcp, client-detection, telemetry, oninitialized]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/telemetry/ClearcutLogger.ts
imported_at: 2026-04-18T00:00:00Z
---

# Detect MCP Client for Per-Client Metrics

## Context

Same MCP server, many clients: Claude Code, Gemini CLI, OpenAI Codex, Google Antigravity, custom CLIs. If you want to know "which client is hot / which clients see which failures", the server has to identify the client.

## The fact / decision / pitfall

The MCP protocol's `initialize` handshake carries a `clientInfo` with `name` and `version`. Hook `server.server.oninitialized` and read `server.server.getClientVersion()?.name`, then match substrings (case-insensitive):

```ts
server.server.oninitialized = () => {
  const clientName = server.server.getClientVersion()?.name;
  if (clientName) clearcutLogger?.setClientName(clientName);
};

setClientName(name: string): void {
  const lower = name.toLowerCase();
  if (lower.includes('claude')) this.#mcpClient = McpClient.MCP_CLIENT_CLAUDE_CODE;
  else if (lower.includes('gemini')) this.#mcpClient = McpClient.MCP_CLIENT_GEMINI_CLI;
  else if (name === DAEMON_CLIENT_NAME) this.#mcpClient = McpClient.MCP_CLIENT_DT_MCP_CLI;
  else if (lower.includes('openclaw')) this.#mcpClient = McpClient.MCP_CLIENT_OPENCLAW;
  else if (lower.includes('codex')) this.#mcpClient = McpClient.MCP_CLIENT_CODEX;
  else if (lower.includes('antigravity')) this.#mcpClient = McpClient.MCP_CLIENT_ANTIGRAVITY;
  else this.#mcpClient = McpClient.MCP_CLIENT_OTHER;
}
```

Every subsequent telemetry event is tagged with that client enum.

## Evidence

- `src/telemetry/ClearcutLogger.ts::setClientName` — the substring-matching list.
- `src/index.ts` — `server.server.oninitialized` wiring.
- `CHANGELOG.md` 0.21.0: `telemetry: record client name`.

## Implications

- Don't leak raw client names to analytics; bucket to a known enum + "other". Raw names are per-version strings that explode cardinality.
- Identify your own daemon/CLI by an exact match on a constant (`DAEMON_CLIENT_NAME`), not substring — you know your own name.
- Keep the enum extensible; new MCP clients launch constantly. Add a CI task that logs "unknown client name: X" once per session so you can expand the bucketing.
- Per-client success/latency segmentation is a high-value metric; two clients often exercise *different* tool surfaces and see different failure rates.
- Don't rely on client-supplied name for authorization. It's self-reported.
