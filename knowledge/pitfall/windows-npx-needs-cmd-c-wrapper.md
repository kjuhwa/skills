---
version: 0.1.0-draft
name: windows-npx-needs-cmd-c-wrapper
summary: On Windows, spawning `npx` directly from an MCP host (VS Code extension host, Claude Desktop) often fails with "Connection closed" / error -32000 because npx is a PowerShell/CMD script, not a Node executable; wrap it as `cmd /c npx ...` or resolve the absolute `.cmd`/`.ps1`/`.bat` path.
category: pitfall
confidence: high
tags: [windows, npx, mcp, subprocess, vscode]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: docs/troubleshooting.md
imported_at: 2026-04-18T00:00:00Z
---

# Windows `npx` Needs a `cmd /c` Wrapper

## Context

Users configure MCP servers in `.mcp.json` with `{"command": "npx", "args": ["mypkg@latest"]}`. On macOS/Linux this works. On Windows 10 and up, launching from a VS Code extension host or Claude Desktop frequently fails with:

```
Error during discovery for MCP server: MCP error -32000: Connection closed
```

## The fact / decision / pitfall

`npx` on Windows is a script (`.cmd`, `.bat`, or `.ps1`), not a binary. When Node's `child_process.spawn` is asked to run `"npx"`, it doesn't auto-resolve that to the shell wrapper the way a human terminal does. The MCP host's stdio transport immediately sees stream closure and errors out.

Two supported fixes:

1. **Wrap in `cmd /c`** — most portable:
```json
{
  "command": "cmd",
  "args": ["/c", "npx", "-y", "mypkg@latest"]
}
```

2. **Give the absolute path to the npx shim** — depends on your Node install:
```json
{
  "command": "C:\\nvm4w\\nodejs\\npx.ps1",
  "args": ["-y", "mypkg@latest"]
}
```

## Evidence

- `docs/troubleshooting.md` — the chrome-devtools-mcp project documents both workarounds with attribution to `modelcontextprotocol/servers#1082`.
- Observed across many MCP servers, not chrome-devtools-mcp specifically.

## Implications

- When shipping an MCP package to Windows users, include both workarounds in your README; users will Google "MCP -32000" before reading install docs.
- Your own CLI entry points shouldn't rely on being invoked via `npx` in user config — if you expect Windows users, publish a `.exe` via `pkg`/`nexe` or provide a `.cmd` shim yourself.
- The same issue bites any cross-platform tool that uses `npx` as the MCP launcher: `@modelcontextprotocol/server-filesystem`, `@playwright/mcp`, etc. It's a protocol/transport-level quirk, not specific to any one server.
- If you test your MCP in PowerShell but a user reports it failing under VS Code's extension host, the root cause is almost always this — not actual code problems.
