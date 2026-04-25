---
name: fifo-mutex-for-serialized-tool-calls
description: Use a simple FIFO async mutex with a disposable guard so that concurrent MCP tool invocations against a single shared browser/session run one-at-a-time in the order received.
category: mcp
version: 1.0.0
version_origin: extracted
tags: [async, mutex, concurrency, mcp, single-session]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/Mutex.ts
imported_at: 2026-04-18T00:00:00Z
---

# FIFO Async Mutex with Disposable Guard

## When to use

- Your MCP server (or any tool dispatcher) holds a single stateful resource — a browser, a connection, a REPL — and tools mutate it.
- Clients can pipeline tool calls faster than the resource can safely handle, and you want strict first-come-first-served order.
- You need a tiny dependency-free primitive, not `async-mutex` or `p-queue`, because it's three methods.

## How it works

- Maintain `#locked: boolean` and `#acquirers: Array<() => void>`.
- `acquire()`: if unlocked, set locked and return a Guard. Otherwise push a resolver into `#acquirers`, await the promise, then return a Guard. Order of the array is FIFO.
- `release()`: shift the first waiter and resolve. If the queue is empty, unset `locked`. Never set `locked = false` when there are waiters — that races.
- `Guard.dispose()` calls `release()`. Use `using guard = await mutex.acquire();` with TC39 explicit resource management, or `try { ... } finally { guard.dispose(); }` on older runtimes.

## Example

```ts
export class Mutex {
  static Guard = class {
    constructor(mutex) { this.mutex = mutex; }
    dispose() { this.mutex.release(); }
  };
  #locked = false;
  #acquirers: Array<() => void> = [];
  async acquire() {
    if (!this.#locked) { this.#locked = true; return new Mutex.Guard(this); }
    const {resolve, promise} = Promise.withResolvers<void>();
    this.#acquirers.push(resolve);
    await promise;
    return new Mutex.Guard(this);
  }
  release() {
    const resolve = this.#acquirers.shift();
    if (!resolve) { this.#locked = false; return; }
    resolve();
  }
}

// usage in tool dispatcher
const guard = await toolMutex.acquire();
try { await tool.handler(request, response, context); }
finally { guard.dispose(); }
```

## Gotchas

- The subtle bug: if `release()` sees a waiter, keep `#locked = true`. Resetting it momentarily is what lets a *new* caller leapfrog the queued ones.
- Always `dispose()` in `finally`. Throwing handlers that skip release deadlock all subsequent tool calls.
- `Promise.withResolvers()` is Node 22+ / modern runtimes. On older engines, replicate with `let r; const p = new Promise(res => r = res);`.
- This is FIFO but not fair across priorities. If some tools are "quick" (status check) and some are slow (performance trace), they still queue together — add a priority queue only when you actually observe starvation.
- Works for a single process. If you ever shard the state across workers, you need cross-process locking (file lock, redlock) instead.
