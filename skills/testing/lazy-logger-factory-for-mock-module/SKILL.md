---
name: lazy-logger-factory-for-mock-module
description: Wrap every module's logger behind a per-module `getLog()` function with a cached instance, so Bun's `mock.module('@archon/paths')` interception gets the fresh mock instead of the pre-imported real logger.
category: testing
version: 1.0.0
version_origin: extracted
tags: [bun, testing, mock, logger, pino, defer-init]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
---

# Lazy Logger Factory for Bun `mock.module()` Interception

## When to use

- You have a pattern where every module creates a child logger at import time: `const log = createLogger('my-module');`.
- You test one of those modules in Bun and want to use `mock.module('@archon/paths', () => ({ createLogger: () => fakeLogger }))` to assert on log calls.
- The mock doesn't intercept — logs still go through the real logger — because `const log = createLogger(...)` ran **before** the test's `mock.module()` registered.

## Steps

1. **Replace module-level `const log = createLogger('foo')`** with a lazy getter that resolves at first use:

   ```ts
   import { createLogger } from '@archon/paths';

   /** Lazy-initialized logger (deferred so test mocks can intercept createLogger) */
   let cachedLog: ReturnType<typeof createLogger> | undefined;
   function getLog(): ReturnType<typeof createLogger> {
     if (!cachedLog) cachedLog = createLogger('foo.bar');
     return cachedLog;
   }
   ```

2. **Replace every `log.info(...)` call with `getLog().info(...)`**. The one-level extra function call is effectively free after the first invocation (V8 inlines the cached-return path).

3. **Do this in every module that creates a logger.** Archon has this pattern in 70+ files with the identical comment `// Lazy-initialized logger (deferred so test mocks can intercept createLogger)` so the intent is grep-able across the codebase.

4. **In the test**, mock the `@archon/paths` module **at the top of the file**, then import the module under test:

   ```ts
   import { mock, describe, test } from 'bun:test';

   const fakeLogger = { info: mock(), warn: mock(), error: mock(), debug: mock(), fatal: mock() };

   mock.module('@archon/paths', () => ({
     createLogger: () => fakeLogger,
     // …pass through anything else the target needs from @archon/paths
   }));

   // Now import — the lazy getter inside will call our mocked createLogger
   const { doStuff } = await import('./foo-bar');
   ```

5. **Reset `cachedLog` between tests** only if tests assert on *different* fake loggers. In most cases, a single shared fake with `mock.mock.calls.length = 0` per test is enough, because the cache key doesn't need to change.

## Counter / Caveats

- This pattern is **specifically** for Bun's `mock.module()`. Jest transforms work at a different layer and don't suffer the same issue; in Jest, top-level `createLogger()` is fine.
- Don't over-lazy. This pattern is justified for loggers because they're touched on hot paths and mocked heavily in tests. For other cross-cutting services (telemetry, metrics), the same pattern works; for rarely-called helpers, a plain top-level import is fine.
- If your logger factory has side effects (e.g. `createLogger` registers a subscriber), deferring it changes observable behavior. Archon's `pino` logger is pure construction, so deferral is safe.
- The pattern doesn't help if *another module* called the real `createLogger` before your mock. Pair it with the bun-mock-module test-batching skill to ensure no earlier file has polluted the cache.

## Evidence

- 70+ files in `packages/**` contain the literal comment "Lazy-initialized logger (deferred so test mocks can intercept createLogger)" (grep-able).
- Representative example: `packages/isolation/src/resolver.ts:34-39`, `packages/workflows/src/condition-evaluator.ts:20-24`, `packages/server/src/adapters/web/transport.ts:3-8`.
- Identical shape across the codebase (cached variable + typed-via-`ReturnType` getter) shows the convention is codified even without a helper.
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
