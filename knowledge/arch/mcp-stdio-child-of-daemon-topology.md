---
version: 0.1.0-draft
name: mcp-stdio-child-of-daemon-topology
summary: The chrome-devtools-mcp daemon architecture is a 3-process chain — CLI client talks to a daemon over a socket, and the daemon spawns the real MCP stdio server as a child and connects to it with an MCP Client. This keeps "MCP stdio transport" as the only server protocol while adding CLI-level persistence.
category: arch
confidence: high
tags: [daemon, mcp, stdio, architecture, ipc]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/daemon/daemon.ts
imported_at: 2026-04-18T00:00:00Z
---

# CLI → Daemon → MCP Stdio Server Topology

## Context

MCP servers normally speak stdio to exactly one client. To build a persistent CLI where `mycli foo; mycli bar` reuses state, naïve approaches are tempting: make the CLI re-exec the stdio server every call (slow), or teach the server a second transport (maintenance burden forever). Chrome DevTools MCP picked a third route.

## The fact / decision / pitfall

Three processes:

1. **CLI client** (`chrome-devtools <subcommand>`): opens a local Unix socket / Windows named pipe, sends one JSON request `{method, tool, args}`, reads one response, exits.
2. **Daemon** (`chrome-devtools-daemon`): long-lived. Listens on the socket. Internally instantiates an MCP `Client` with `StdioClientTransport`, which spawns…
3. **MCP stdio server** (`chrome-devtools-mcp`): the actual server, completely unaware of the daemon. Speaks stdio MCP as usual.

The daemon forwards `invoke_tool` requests to the MCP client, serializes the response back over the socket, replies to the CLI, closes the socket. Browser/session state lives in the MCP stdio server process — the daemon is a thin forwarder.

## Evidence

- `src/daemon/daemon.ts` creates `StdioClientTransport({command: process.execPath, args: [INDEX_SCRIPT_PATH, ...mcpServerArgs]})` and connects an MCP `Client` to it.
- `src/daemon/client.ts::sendCommand` opens `net.createConnection({path: socketPath})` with `PipeTransport` and sends `{method:'invoke_tool', tool, args}`.
- `src/bin/chrome-devtools.ts` is the yargs entry — for every auto-generated command, it ensures the daemon is running then calls `sendCommand`.

## Implications

- The MCP stdio server is zero-change; it doesn't learn about daemons. You could drop in a different MCP server and the daemon still works.
- Telemetry/opt-out/version-check logic lives in the MCP server, not the daemon. The daemon only sees opaque tool calls.
- Debugging: `DEBUG=* chrome-devtools foo` turns on logging in the CLI, but the MCP server's own logs only flow if you pass `--log-file` at daemon start.
- The daemon's startup args are captured at `start` time and sent to every subsequent MCP server spawn — so `chrome-devtools start --headless` changes the daemon's config and a `stop` + `start` is required to change it.
- If the MCP server crashes, the daemon's `Client` breaks. The daemon should detect and either auto-restart the child or surface the error to the CLI. chrome-devtools-mcp currently surfaces; a resilient daemon could do more.
