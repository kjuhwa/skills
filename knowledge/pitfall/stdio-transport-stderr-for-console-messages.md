---
version: 0.1.0-draft
name: stdio-transport-stderr-for-console-messages
summary: MCP stdio transport uses stdout for the JSON-RPC protocol, so any `console.log` from your server code corrupts the stream; always `console.error` for diagnostic output, and even then reserve it for actual diagnostics users need to see.
category: pitfall
confidence: high
tags: [mcp, stdio, stderr, stdout, protocol-corruption]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/index.ts
imported_at: 2026-04-18T00:00:00Z
---

# Never `console.log` in an MCP Stdio Server

## Context

MCP stdio transport writes newline-delimited JSON-RPC frames on stdout. Anything else on stdout — a stray `console.log("got here")`, a library you depend on spewing warnings — corrupts the protocol stream and the client typically responds with `Error -32700: Parse error` or connection closed.

## The fact / decision / pitfall

The rule: your MCP stdio server must treat stdout as output-only for protocol frames. Everything else (startup disclaimers, warnings, runtime logs) goes to stderr.

chrome-devtools-mcp does this explicitly:

```ts
// src/index.ts::logDisclaimers
console.error(`chrome-devtools-mcp exposes content of the browser instance to the MCP clients...`);
console.error(`Google collects usage statistics to improve Chrome DevTools MCP. To opt-out, run with --no-usage-statistics.`);
```

Even the user-facing disclaimer at startup goes to stderr. Log files get the same treatment: the `logger` utility either writes to stderr or appends to a file if `--log-file` was specified. Never stdout.

## Evidence

- `src/index.ts::logDisclaimers` — `console.error` for all user-visible startup messages.
- `src/logger.ts` — writes to stderr/log file.
- MCP SDK internals use stdout for framed messages.

## Implications

- Audit third-party dependencies for stray `console.log`. A library update can introduce one silently. Wrap suspicious imports behind a `console.log = console.error` shim if you don't trust them.
- Even "just for debugging" temporary logs need to be `console.error`. The failure mode of "my server silently disconnects" is expensive to debug.
- MCP HTTP transport doesn't have this problem; moving to HTTP can be a fix if stdout purity is hard.
- Test coverage: run your server with a spy on stdout that asserts every line is valid JSON-RPC. Catches regressions.
- When a user reports `-32700: Parse error`, check for a console.log before anything else.
