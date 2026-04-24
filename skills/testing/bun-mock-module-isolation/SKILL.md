---
name: bun-mock-module-isolation
description: Split per-package Bun tests into multiple `bun test` invocations to avoid irreversible `mock.module()` cache pollution.
category: testing
version: 1.0.0
version_origin: extracted
tags: [bun, testing, mock, isolation, monorepo]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
linked_knowledge: [bun-mock-module-process-global]
---

# Bun `mock.module()` Test Batching for Cross-File Isolation

## When to use

- You are on Bun and have multiple test files that each call `mock.module(path, ...)` for the **same module path** with different implementations.
- You see ~dozens of unexplained failures only when tests are run together, but they pass individually.
- You cannot migrate off Bun's mock API but need reliable CI runs.

Bun's `mock.module()` permanently rewrites the module in the process-wide cache. `mock.restore()` does **not** undo it ([oven-sh/bun#7823](https://github.com/oven-sh/bun/issues/7823)). The only reliable isolation is a fresh process per conflicting group.

## Steps

1. **Identify conflict groups.** Grep your test files for `mock.module('<path>'`. Any path that appears in two or more files with different return shapes is a conflict group.
2. **Assign each conflict group its own `bun test` invocation** inside the package's `test` script. Keep non-conflicting files grouped together for speed.
3. **Keep the root `bun test`-from-repo-root command off-limits.** Document it in `CLAUDE.md` / `CONTRIBUTING.md` — root-level `bun test` discovers everything and reintroduces pollution.
4. **Prefer `spyOn()` for intra-package mocking.** `spy.mockRestore()` **does** work; use it whenever the target is imported by another file in the same package.
5. **When adding a new test file that calls `mock.module()`**, check whether the same path is mocked elsewhere and, if so, add the new file to its own `bun test` invocation in `package.json`.

Example `package.json` shape (shortened):

```json
{
  "scripts": {
    "test": "bun test src/a.test.ts && bun test src/b.test.ts && bun test src/group-c/"
  }
}
```

Archon's `@archon/core` splits into 7 batches, `@archon/workflows` into 5, `@archon/adapters` into 3, `@archon/isolation` into 3.

## Counter / Caveats

- Each extra invocation adds ~JVM-like Bun startup cost; don't split gratuitously. Group non-conflicting files together.
- `spyOn` is **not** a substitute when the target is in a different package imported via workspace resolution — in practice `mock.module()` is the only Bun tool that rewires transitive imports.
- Root-level `bun test` is still useful for quick *single-file* checks; the batching rule is about CI and `bun run test`.

## Evidence

- Archon root `CLAUDE.md` (lines 131-133) codifies the "Do NOT run `bun test` from the repo root" rule and explains why: discovering all files in one process causes ~135 mock pollution failures.
- `packages/core/package.json` `scripts.test` chains ~8 `&&`-separated `bun test` invocations, grouping files that conflict on shared mocks.
- Archon issue reference in the CLAUDE.md comment: Bun [oven-sh/bun#7823](https://github.com/oven-sh/bun/issues/7823).
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
