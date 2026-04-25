---
version: 0.1.0-draft
name: effect-ts-layer-dependency-injection-for-testing
summary: Effect.ts Layers provide compile-time dependency injection; compose layers to swap real services with test stubs
type: knowledge
category: architecture
confidence: high
tags: [effect-ts, testing, architecture]
source_type: extracted-from-git
source_url: https://github.com/pingdotgg/t3code.git
source_ref: main
source_commit: 9df3c640210fecccb58f7fbc735f81ca0ee011bd
source_project: t3code
imported_at: 2026-04-18
evidence:
  - apps/server/src/orchestration/Layers
  - apps/server/src/orchestration/Layers/OrchestrationEngine.test.ts
---

## Fact
Effect.ts's `Layer` abstraction is a function that returns an Effect producing a service interface. Services are tagged (`Tag`) for identification. You compose layers with `Layer.provide()` to wire dependencies. This allows tests to substitute real services with stubs without modifying test code.

## Why it matters
1. **No mocking libraries needed** — just implement the service interface in a test version
2. **Compile-time safety** — if a service is missing or incompatible, TypeScript catches it
3. **Deterministic tests** — test services return fixed values, no randomness or side effects
4. **Reusable test layers** — build a layer once, use in many tests
5. **Gradual adoption** — real code uses real layers, tests swap in stubs; no changes to real code needed

## Evidence
- Server code defines layers like `OrchestrationEngine`, `CheckpointReactor` using `Layer.effect(..., () => ...)`
- Test files import same services and layer them together with test doubles
- OrchestrationEngine.test.ts shows: compose GitCore stub + real OrchestrationEngine to test orchestration logic in isolation

## How to apply
- Define each service as a `Tag` and `Layer.effect(TAG, () => Effect producing interface)`
- In tests, create a stub object implementing the same interface
- Build test layer: `const stubGit = Layer.succeed(GitCore, { executeGit: () => ... })`
- Compose: `const testLayers = Layer.compose(stubGit, realOrchestration)`
- Run test: `const result = yield* testEffect.pipe(Effect.provide(testLayers))`
- Document test layer composition in test files so maintainers know what's stubbed
