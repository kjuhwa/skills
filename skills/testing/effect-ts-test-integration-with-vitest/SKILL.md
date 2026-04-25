---
name: effect-ts-test-integration-with-vitest
description: Test effect-based services by composing layers with Vitest, using drain() instead of sleep for deterministic async
category: testing
version: 1.0.0
version_origin: extracted
confidence: medium
tags: [effect-ts, testing, vitest]
source_type: extracted-from-git
source_url: https://github.com/pingdotgg/t3code.git
source_ref: main
source_commit: 9df3c640210fecccb58f7fbc735f81ca0ee011bd
source_project: t3code
imported_at: 2026-04-18
evidence:
  - apps/server/src/orchestration/Layers/CheckpointReactor.test.ts
  - apps/server/src/orchestration/Layers/ProviderRuntimeIngestion.test.ts
---

## When to Apply
- You write tests for Effect.ts-based services with side effects (I/O, async, external services)
- You want tests to be deterministic and not flaky
- You're using Vitest as your test runner (not Jest)
- You need to stub external services (git, providers, filesystem)

## Steps
1. Define your service layer as `Layer.effect(TAG)` that yields a `{ method1, method2 }` interface
2. Create test doubles (stubs) that implement the same interface but return fixed/controlled values
3. In test, build a layer graph that includes test doubles instead of real implementations
4. Use `Effect.gen` to compose the test effect
5. Instead of `sleep`, use `worker.drain()` or `stream.toArray()` to wait for async work
6. Run effect via `Effect.runPromise()` or Vitest's Effect integration
7. Assert state after all async milestones complete

## Example
```typescript
const mockGitCore = Layer.succeed(GitCore, {
  executeGit: (cmd) => Effect.succeed({ stdout: '...' }),
  getStatus: () => Effect.succeed({ isRepo: true })
})

const testEffect = Effect.gen(function*() {
  const orchestration = yield* OrchestrationEngine
  const worker = yield* checkpointReactor

  yield* orchestration.dispatch({ type: 'thread.turn.start', ... })
  yield* worker.drain()  // wait for checkpoint work to finish

  const checkpoints = yield* orchestration.getCheckpoints(...)
  expect(checkpoints).toHaveLength(1)
})

const layers = Layer.compose(mockGitCore, OrchestrateLayer)
const result = yield* testEffect.pipe(Effect.provide(layers))
```

## Counter / Caveats
- Layer composition order matters; dependencies must be available before use
- Test doubles can diverge from real implementations; keep in sync or use property-based tests
- `drain()` only works for DrainableWorker; other async patterns need `Effect.sleep` or `Future`
- Large test suites with many layers can slow down test startup; consider shared layer fixtures
