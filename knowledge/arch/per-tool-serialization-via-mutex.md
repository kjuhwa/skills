---
version: 0.1.0-draft
name: per-tool-serialization-via-mutex
summary: Every incoming MCP tool call in chrome-devtools-mcp acquires a single global `toolMutex` before its handler runs, serializing all tool executions on the shared browser context to avoid CDP concurrency hazards.
category: arch
confidence: high
tags: [mcp, mutex, concurrency, browser-state]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/index.ts
imported_at: 2026-04-18T00:00:00Z
---

# Serialized Tool Dispatch via Global Mutex

## Context

MCP clients can pipeline tool calls. If your server holds a single shared browser session, two concurrent `navigate` calls race; `take_snapshot` during a `click`'s wait-for-stable-dom can mutate the page. CDP itself tolerates some parallelism but many high-level Puppeteer operations don't.

## The fact / decision / pitfall

There is one global `Mutex` instance in `createMcpServer`. Every registered tool's handler is wrapped:

```ts
const toolMutex = new Mutex();
// ...
server.registerTool(tool.name, {...}, async params => {
  const guard = await toolMutex.acquire();
  try {
    return await runHandler(tool, params);
  } finally {
    guard.dispose();
  }
});
```

The mutex is FIFO; clients that pipeline calls see them executed in the order they were sent. There is no per-page or per-category sub-locking.

## Evidence

- `src/index.ts::createMcpServer` — the `toolMutex = new Mutex()` line and its usage wrapping every tool.
- `src/Mutex.ts` — the FIFO implementation.

## Implications

- A long-running tool (performance trace, 5+ seconds) blocks all other calls until it completes. This is deliberate — the browser is the shared resource and you don't want to race.
- Agents that want parallelism across multiple pages need to use `experimentalPageIdRouting` and a per-page lock strategy — not supported in stock chrome-devtools-mcp.
- A crashed handler that doesn't release the guard deadlocks everything. The `try/finally` + `guard.dispose()` pattern is load-bearing; don't skip `finally`.
- If you ever add fire-and-forget tools (start a recording and return immediately), the mutex needs to be released before the recording completes — carefully. Don't let "readOnlyHint: true" fool you into skipping the lock.
- For Web Workers or multi-browser servers, replace the single Mutex with a per-resource keyed mutex map.
