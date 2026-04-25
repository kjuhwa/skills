---
version: 0.1.0-draft
name: process-title-for-debug-visibility
summary: Setting `process.title` early in each process (CLI, daemon, MCP server, watchdog) gives `ps`/`top`/Task Manager immediately-recognizable names — critical when a single install spawns four cooperating node processes.
category: decision
confidence: medium
tags: [debugging, process-title, multi-process, ops]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/bin/chrome-devtools.ts
imported_at: 2026-04-18T00:00:00Z
---

# Set `process.title` Early in Each Binary

## Context

The chrome-devtools-mcp install can have several node processes running simultaneously: the MCP stdio server, the daemon, the watchdog subprocess, the CLI client, plus the spawned Chrome. In `ps aux`, they all look like `node /usr/local/lib/node_modules/chrome-devtools-mcp/...` unless you do something.

## The fact / decision / pitfall

Set `process.title` as the very first statement after imports in each binary:

```ts
// src/bin/chrome-devtools.ts
process.title = 'chrome-devtools';
// src/bin/chrome-devtools-mcp.ts (implied)
process.title = 'chrome-devtools-mcp';
// daemon, watchdog similar
```

The CHANGELOG entry `set process titles for easier debugging (#1770)` marks this as an intentional ops-quality improvement.

## Evidence

- `src/bin/chrome-devtools.ts` line 9: `process.title = 'chrome-devtools';`
- `CHANGELOG.md` 0.21.0 entry: `🏗️ Refactor: set process titles for easier debugging`.

## Implications

- When a user reports "my machine is slow", `ps aux | grep chrome-devtools` with distinct titles tells you which component is hot. Without it, you stare at three identical `node` lines.
- On Linux, `process.title` is truncated to the length of the original argv buffer. For long titles, pad by launching with `node --title=foo`, or accept the truncation.
- On macOS, `process.title` shows in Activity Monitor as a "Process Name" column.
- This is one-line tooling hygiene with large payoff. Apply it to every long-running subprocess you ship, not just the top-level binary.
