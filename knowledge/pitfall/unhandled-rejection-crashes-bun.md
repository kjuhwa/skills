---
version: 0.1.0-draft
name: unhandled-rejection-crashes-bun
summary: Bun (unlike Node) terminates the process on unhandled promise rejections by default — SDK subprocess abort can propagate unhandled rejections, so the server installs process.on('unhandledRejection') to log and swallow them.
category: pitfall
tags: [bun, unhandled-rejection, process-exit, promise]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/server/src/index.ts
imported_at: 2026-04-18T00:00:00Z
---

# Bun crashes on unhandled rejections

### The difference from Node
In Node, unhandled promise rejections emit a warning and (in modern Node) eventually crash. In Bun, the default is **terminate immediately** — no warning, the process just exits with a non-zero code.

### Why it bites Craft Agents
The Claude Agent SDK abort path rejects internal promises when a session is interrupted. If the caller didn't `.catch()` those promises — and many don't, because they're passed across async boundaries — Bun sees an unhandled rejection and kills the server.

### The guard
`packages/server/src/index.ts` installs at module top:
```ts
process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.error(`[server] Unhandled rejection (caught, not crashing): ${msg}`);
});
```

Two things:
1. Installing an `unhandledRejection` listener changes Bun's default behavior — now the process stays alive, you log.
2. The comment is explicit about WHY (SDK subprocess abort), so future maintainers don't remove the "unused" handler.

### What this means for OTHER Bun servers
- Always install the handler at the top of any Bun entry point that spawns SDK subprocesses or awaits external streams you can't fully `.catch()`.
- Log the reason — silent swallowing is worse than the crash because real bugs disappear.
- Consider also `process.on('uncaughtException')` for sync throws that would exit.

### When NOT to install
In application server code that has good promise hygiene, suppressing the crash hides bugs. If your codebase is clean, keep the default and fix the real leaks.

### Symptoms if you miss it
- Server runs fine for hours.
- User cancels a mid-stream LLM response.
- Server process exits with code ≠ 0 and no useful stdout/stderr.
- Monitoring restarts it; user reconnects; issue "goes away". But you just had a data-loss window.

### Reference
- `packages/server/src/index.ts` lines 50-55 (top of file).
