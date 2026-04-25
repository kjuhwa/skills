---
name: detached-watchdog-telemetry-process
description: Run telemetry shipping in a detached child process fed by the parent over stdin, so telemetry never blocks tool execution and gets a guaranteed flush-on-parent-death window.
category: telemetry
version: 1.0.0
version_origin: extracted
tags: [telemetry, watchdog, child-process, ipc, reliability]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/telemetry/WatchdogClient.ts
imported_at: 2026-04-18T00:00:00Z
---

# Watchdog Child Process for Telemetry

## When to use

- Your app emits telemetry events but can't afford to block tool calls on network I/O, retries, or rate-limit backoff.
- Events are low-value individually but matter in aggregate; losing a handful on crash is acceptable, dropping the whole buffer on normal exit is not.
- You want telemetry completely gone in tests and opt-outs, not just a no-op flag.

## How it works

- Parent process spawns a `node watchdog/main.js` as a detached child with `stdio: ['pipe', 'ignore', 'ignore']` and `child.unref()` so the child doesn't keep the parent alive on its own.
- Parent `.send(msg)` writes `JSON.stringify(msg) + '\n'` to the child's stdin. Messages are fire-and-forget; if stdin is destroyed the parent logs and drops.
- Child reads newline-delimited JSON via `readline.createInterface({input: process.stdin})`. It buffers events (e.g. 1000-entry ring with drop-oldest overflow) and flushes on a timer.
- Parent-death detection: child listens on `stdin.on('end')`, `stdin.on('close')`, and `process.on('disconnect')`. Any of those fires a shutdown path that sends a `server_shutdown` event, runs a short final-flush with a 5s race against `setTimeout`, then exits.
- Config flows via argv at spawn time (`--parent-pid=`, `--app-version=`, `--clearcut-endpoint=`, `--log-file=`). No shared filesystem state between parent and child during a session.

## Example

```ts
// WatchdogClient.ts - parent side
const child = spawn(process.execPath, [watchdogPath,
  `--parent-pid=${process.pid}`,
  `--app-version=${appVersion}`,
  `--os-type=${osType}`,
  ...(logFile ? [`--log-file=${logFile}`] : []),
], { stdio: ['pipe', 'ignore', 'ignore'], detached: true });
child.unref();
function send(msg) {
  if (child.stdin && !child.stdin.destroyed) {
    child.stdin.write(JSON.stringify(msg) + '\n');
  }
}

// watchdog/main.ts - child side
process.stdin.on('end', () => onParentDeath('stdin end'));
process.stdin.on('close', () => onParentDeath('stdin close'));
readline.createInterface({input: process.stdin}).on('line', line => {
  const msg = JSON.parse(line);
  sender.enqueueEvent(msg.payload);
});
function onParentDeath(reason) {
  sender.sendShutdownEvent().finally(() => process.exit(0));
}
```

## Gotchas

- If you don't call `child.unref()`, node won't exit while the watchdog is alive — your CLI looks hung.
- `stdio: 'pipe'` for stdin is required for IPC; stdout/stderr should be `'ignore'` or redirected, or the detached child's output will appear mid-prompt in a TTY parent.
- On normal parent exit, stdin `end` fires before the child sees disconnect — listen to both so detached vs. IPC-parented spawns both shut down.
- Use `{detached: true}` *and* `unref()`. `detached` alone on Windows doesn't decouple the child's console.
- Race `finalFlush()` against `setTimeout(SHUTDOWN_TIMEOUT_MS)` — never `await` a network call unconditionally in a shutdown path, or a hung endpoint can hold your process open.
- Ship an opt-out env var that is checked in the parent *before* spawning the watchdog; a running-but-idle watchdog still uses memory and file handles.
