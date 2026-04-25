---
version: 0.1.0-draft
name: connect-via-devtools-active-port-file
summary: When Chrome is launched with `--user-data-dir` and remote debugging but the port is auto-chosen, connect by reading the `DevToolsActivePort` file in the user-data-dir — line 1 is the port, line 2 is the browser-target path — to construct `ws://127.0.0.1:<port><path>`.
category: pitfall
confidence: high
tags: [chrome, cdp, devtools-active-port, connection, puppeteer]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/browser.ts
imported_at: 2026-04-18T00:00:00Z
---

# `DevToolsActivePort` File Connection

## Context

Automation tools want to connect to a Chrome already started by the user — typical for the "attach to my browser" flow. If the user passed `--remote-debugging-port=9222`, connection is easy. If they passed `--remote-debugging-port=0` (pick an ephemeral port) or used `chrome://inspect/#remote-debugging` to enable debugging after launch, the port isn't predictable.

## The fact / decision / pitfall

Chrome writes a `DevToolsActivePort` file into the user-data-dir whenever remote debugging is active. The file has two lines:

```
<port>
<path>
```

Line 1 is the numeric port; line 2 is the full WS path including the browser target UUID, e.g. `/devtools/browser/abc-def-...`. Concatenate for the WebSocket endpoint:

```
ws://127.0.0.1:<port><path>
```

Implementation notes:
- Trim each line; some Chrome builds write with trailing whitespace.
- Validate the port parses as an integer in `1..65535`. Corrupt/empty files happen, particularly if Chrome crashed mid-write.
- On failure to read, tell the user exactly what's wrong: `"Could not connect to Chrome in <dir>. Check if Chrome is running and remote debugging is enabled by going to chrome://inspect/#remote-debugging."`

## Evidence

- `src/browser.ts::ensureBrowserConnected` reads `path.join(userDataDir, 'DevToolsActivePort')` and splits by `\n`.
- The same file pattern is used by Playwright and Lighthouse for the same reason.

## Implications

- The user-data-dir is the discovery mechanism, not the port. A flow that "connects to port 9222" breaks when the user is running multiple Chromes; read the file from each user-data-dir.
- You must have *read* permission on the user-data-dir. MCP servers running sandboxed (macOS Seatbelt, Linux containers) may not; document that as a known fault mode.
- Don't cache the resolved WS endpoint across sessions. Chrome regenerates the browser-target UUID on each launch.
- If you spawn Chrome yourself with `--remote-debugging-port=0`, you can use the same file to discover your own port after startup.
