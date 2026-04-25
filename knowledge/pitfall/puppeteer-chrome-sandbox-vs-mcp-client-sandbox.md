---
version: 0.1.0-draft
name: puppeteer-chrome-sandbox-vs-mcp-client-sandbox
summary: When an MCP server runs inside a macOS Seatbelt or Linux container sandbox imposed by the MCP client, Puppeteer's launched Chrome can't create its own sandboxes and fails to start; the documented workaround is to launch Chrome manually outside the sandbox and connect via `--browser-url`.
category: pitfall
confidence: medium
tags: [macos, seatbelt, linux-container, chrome, sandbox, puppeteer]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: docs/troubleshooting.md
imported_at: 2026-04-18T00:00:00Z
---

# Sandboxed MCP Client Breaks Chrome Launch

## Context

Security-conscious MCP clients (Claude Desktop on macOS, some IDE integrations on Linux) sandbox child processes using macOS Seatbelt or Linux namespaces. The MCP server runs inside that sandbox. When the server spawns Chrome via Puppeteer, Chrome tries to install its *own* internal sandbox — and fails because nested sandboxing requires permissions the outer sandbox denies.

## The fact / decision / pitfall

Symptom: `Could not connect to Chrome. Check if Chrome is running.` or the server exits with a Chrome startup error.

The recommended workaround is architectural:

1. User disables sandboxing for the MCP server binary in their client's settings.
2. OR: User starts Chrome *outside* the sandbox (e.g. manually in a terminal) with `--remote-debugging-port=9222`, and runs the MCP server with `--browser-url http://127.0.0.1:9222`.

The second path bypasses the nested sandbox entirely: the MCP server never launches Chrome; it connects to an already-running one. This is the recommended support posture — don't fight the client's sandbox.

## Evidence

- `docs/troubleshooting.md` — the "Operating system sandboxes" section documents this explicitly.
- `src/browser.ts::ensureBrowserConnected` — supports `browserURL` as a first-class connection mode.

## Implications

- Don't attempt to detect-and-work-around sandboxing in code; the permissions are beyond your control. Document loudly.
- If you're building a similar automation tool (not just Chrome — Puppeteer, Playwright, Selenium, anything that spawns its own sandboxed child), a "connect to running instance" mode is table stakes for sandboxed hosts.
- Tell the user which port to use and how to verify the target is reachable (`curl http://127.0.0.1:9222/json/version`). A diagnostic one-liner saves a support round-trip.
- Similar issue on WSL where the Linux side can't launch the Windows-side Chrome — same workaround, same docs page.
