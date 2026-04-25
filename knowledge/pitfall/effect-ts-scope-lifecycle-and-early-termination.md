---
version: 0.1.0-draft
name: effect-ts-scope-lifecycle-and-early-termination
summary: Effect.ts scopes guarantee finalizers run when scope closes, but exceptions can cause parent scopes to close unexpectedly
type: knowledge
category: pitfall
confidence: high
tags: [effect-ts, pitfall, resource-management, scope]
source_type: extracted-from-git
source_url: https://github.com/pingdotgg/t3code.git
source_ref: main
source_commit: 9df3c640210fecccb58f7fbc735f81ca0ee011bd
source_project: t3code
imported_at: 2026-04-18
evidence:
  - packages/shared/src/DrainableWorker.ts
  - packages/shared/src/KeyedCoalescingWorker.ts
---

## Fact
When you use `Effect.acquireRelease(resource, release)` or `Effect.forkScoped(effect)`, the release/finalizer runs when the scope closes, not when an exception is thrown. If a parent scope encounters an exception, child scopes close immediately, triggering finalizers. If you don't handle exceptions, you risk orphaning resources or seeing finalizers run in unexpected order.

## Why it matters
In t3code, workers are forked into a scope: `Effect.forkScoped(worker)`. If the server crashes or a handler throws, the scope closes and the worker is interrupted. This is usually correct, but:
1. **Queue shutdown is async** — `TxQueue.shutdown` needs to drain pending items first; if scope closes too early, items are lost
2. **Finalizer order matters** — if you have nested scopes (worker → queue → effect), finalizers run in reverse order; wrong order can cause deadlock
3. **Exceptions propagate immediately** — if a child effect throws and is not caught, the parent scope closes without waiting for siblings to finish

## Evidence
- `DrainableWorker` uses `Effect.acquireRelease(TxQueue.unbounded<A>(), TxQueue.shutdown)` — queue shutdown is critical
- Both workers use `Effect.forkScoped()` to fork the queue consumer into the current scope
- `KeyedCoalescingWorker` tracks state in `TxRef` with modify/get transactions; early scope close can leave state inconsistent

## How to apply
- Always wrap shared scope setup in error handlers: `Effect.catchCause()` before the scope closes
- Use `Effect.ensuring()` to guarantee cleanup even if the effect fails
- Test scope teardown explicitly: fork a worker, enqueue items, throw an exception, then verify cleanup
- Document finalizer order if you have nested scopes
- For long-lived scopes (server startup), avoid throwing uncaught exceptions; log and recover instead
