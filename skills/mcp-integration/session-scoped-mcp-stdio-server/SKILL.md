---
name: session-scoped-mcp-stdio-server
description: Ship a per-session MCP stdio server bundled as CJS that provides session-scoped tools (SubmitPlan, config_validate) and uses stderr __CALLBACK__ lines to pause execution for async host-process callbacks.
category: mcp-integration
version: 1.0.0
version_origin: extracted
tags: [mcp, stdio, codex, callbacks, session-scope]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/session-mcp-server/src/index.ts
imported_at: 2026-04-18T00:00:00Z
---

# Session-scoped MCP stdio server with stderr callbacks

## When to use
- Running an SDK (Codex, Copilot) that expects MCP tools via stdio.
- Need per-session context (session ID, workspace root, plans folder) baked into each tool invocation.
- Some tools need to **pause** and wait for a host decision (e.g. OAuth consent UI, plan approval). Stdio is synchronous-looking; you need a sidechannel.

## How it works
1. Build the server as a CJS bundle: `bun build src/index.ts --target=node --format=cjs --outfile dist/index.js`. Ship with a `bin` entry so it's `npx`-able.
2. The host spawns it once per session with session config on argv: `--session-id X --workspace-root /.. --plans-folder /..`.
3. `StdioServerTransport` + `@modelcontextprotocol/sdk/server` register `CallToolRequestSchema` / `ListToolsRequestSchema`.
4. Each tool handler gets a `SessionToolContext` (workspace path + plans path + session id).
5. For tools that need host interaction, write a single-line JSON to **stderr** prefixed with `__CALLBACK__`:
   ```
   __CALLBACK__{"type":"auth_required","sourceSlug":"gmail","authUrl":"https://..."}
   ```
   The host (Electron main) reads the subprocess stderr line-by-line and parses anything starting with that prefix as a structured callback.
6. Use `CALLBACK_TOOL_TIMEOUT_MS` (e.g. 120_000) - if host doesn't respond within the window, return an error from the tool.
7. Read cached credentials the host has written to `<workspaceRoot>/sources/<slug>/.credential-cache.json` - decrypted by host, shared with subprocess through the filesystem not env vars.

## Example
```ts
// In the MCP server
function sendCallback(callback) {
  console.error(`__CALLBACK__${JSON.stringify(callback)}`);
}

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name === 'SubmitPlan') {
    sendCallback({ type: 'plan_ready', sessionId, planPath: '…' });
    // now wait for host decision by polling a response file or a port
  }
  ...
});
```

Host side:
```ts
subprocess.stderr.on('data', (chunk) => {
  for (const line of chunk.toString().split('\n')) {
    if (line.startsWith('__CALLBACK__')) {
      const msg = JSON.parse(line.slice('__CALLBACK__'.length));
      handleCallback(msg);
    } else {
      realLogger.info(line); // pass-through logging
    }
  }
});
```

## Gotchas
- stderr is line-buffered, stdout is the JSON-RPC channel - mixing them breaks the protocol. Always use stderr for sidechannel.
- Bundle to CJS even if host is ESM - avoids `ERR_REQUIRE_ESM` when `runtime-resolver.ts` `spawn`s this at packaged-app runtime.
- Ship via `dist/index.js` in the app resources and electron-builder `files:` glob or you'll get "Cannot find module" in production only.
- Pass session paths on argv, not env, so you can see them in `ps` output for debugging.
- `CALLBACK_TOOL_TIMEOUT_MS` must be longer than any expected user interaction (120s+).
