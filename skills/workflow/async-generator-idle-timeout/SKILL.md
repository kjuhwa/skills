---
name: async-generator-idle-timeout
description: Wrap a streaming `AsyncGenerator` with an idle-reset timeout so subprocess hangs turn into clean returns instead of indefinite blocks.
category: workflow
version: 1.0.0
version_origin: extracted
tags: [async-generator, timeout, deadlock, streaming, subprocess]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
---

# Idle-Reset Timeout Wrapper for `AsyncGenerator`

## When to use

- You consume a streaming `AsyncGenerator` whose producer is a subprocess (AI SDK, MCP client, streaming HTTP). You want to terminate cleanly when the producer finishes its work **but fails to close the stream** — stuck MCP connection, dangling child process, unexpected silence.
- A hard wall-clock timeout (e.g. `Promise.race(gen.next(), timer(10min))`) is wrong because legitimate long-running work would be killed. You want "no output for N minutes" to be the trigger, not "N minutes since start."
- You need the hang to turn into a normal generator completion, not an unhandled rejection or half-closed state.

## Steps

1. **Design the wrapper as `async function*`** yielding the same element type, accepting `(generator, timeoutMs, onTimeout?, shouldResetTimer?)`.
2. **Race `generator.next()` against a `setTimeout` promise** resolving to a unique Symbol sentinel. Clear the timer after each race:

   ```ts
   const IDLE_TIMEOUT_SENTINEL = Symbol('IDLE_TIMEOUT');
   const timeoutPromise = new Promise(r => { timer = setTimeout(() => r(IDLE_TIMEOUT_SENTINEL), remaining); });
   const nextPromise = generator.next();
   const result = await Promise.race([nextPromise, timeoutPromise]);
   clearTimeout(timer);
   ```

3. **On timeout (`result === SENTINEL`):**
   - Call `onTimeout?.()` — this is where you abort the subprocess / MCP client. It runs before the generator returns so the caller can clean up.
   - Attach `.catch(() => {})` to the in-flight `nextPromise` so the eventual rejection from the aborted subprocess doesn't become an unhandled rejection.
   - `return` (not `throw`) so the wrapper appears as a clean generator completion. **Do not call `generator.return()`** here — it blocks on the pending `.next()` that will never settle.
4. **Reset the timer on every yielded value by default.** Allow the caller to override via an optional `shouldResetTimer(value)` predicate for cases where certain message types (e.g. heartbeats) shouldn't count as progress.
5. **Use a generous default (Archon uses 30 minutes).** This is a deadlock detector, not a budget limiter. The timer resets on every message, so only *complete* silence fires it.
6. **In the `finally` block**, if we did **not** time out, call `generator.return()` to let the producer clean up (for `break` in the consumer loop). If we did time out, skip — `generator.return()` would hang on the same pending `.next()`.
7. **Log cleanup errors from `generator.return()`** at warn level using a dynamically-imported logger so the wrapper can stay zero-dependency on your core packages (avoids circular deps).

## Counter / Caveats

- **Leaked `setTimeout` timers** will keep Node's event loop alive. `clearTimeout` after the race is non-negotiable — don't skip it in the "yield" path.
- **`onTimeout` must be synchronous or fire-and-forget.** The wrapper doesn't await it; if you need to `await` cleanup, move that await into the caller's "what happens after the wrapper returns" path.
- **Using `Promise.race` on the same `generator.next()` twice is illegal.** That's why we create a **fresh** `nextPromise` each iteration of the while loop.
- If the producer is a well-behaved generator that always terminates, you can still use this wrapper — it just never fires.
- Reset strategy choice matters: for an AI stream where "assistant, assistant, tool_use, tool_result" cadence is normal, reset-on-every-message is correct. For a pure-text stream where you'd expect chunks every ~1s, a `shouldResetTimer(v) => v.type !== 'heartbeat'` predicate avoids heartbeats masking a real stall.

## Evidence

- `packages/workflows/src/utils/idle-timeout.ts` (117 lines): full implementation.
- `STEP_IDLE_TIMEOUT_MS = 30 * 60 * 1000` default at `idle-timeout.ts:22`.
- Sentinel pattern at `idle-timeout.ts:25` — unique Symbol avoids false matches against yielded values.
- `.catch` on pending next-promise at `idle-timeout.ts:77-79` prevents unhandled rejection from aborted subprocess.
- `finally` block at `idle-timeout.ts:93-115` with the "don't call `generator.return()` after timeout" comment.
- Used throughout `packages/workflows/src/dag-executor.ts` (loop nodes) to prevent AI-subprocess hangs.
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
