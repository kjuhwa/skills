---
version: 0.1.0-draft
name: bun-mock-module-process-global
summary: Bun's `mock.module()` permanently rewires the process-wide module cache; `mock.restore()` does not undo it.
category: testing
confidence: high
tags: [bun, testing, mock, gotcha]
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
linked_skills: [bun-mock-module-isolation]
---

# Bun `mock.module()` Is Process-Global and Irreversible

## Fact / Decision

In Bun, `mock.module(path, factory)` mutates the module in the **process-wide module cache**. Unlike Jest's per-test-file isolation, once a Bun test file calls `mock.module(path, ...)`, every subsequent file loaded in the same `bun test` process sees the mocked version. `mock.restore()` does **not** revert module-level mocks — it only restores `spyOn` spies. `afterAll(() => mock.restore())` is a false-confidence pattern.

The upstream bug tracking this is [oven-sh/bun#7823](https://github.com/oven-sh/bun/issues/7823).

Two consequences that matter for real codebases:

1. **Tests pass in isolation, fail in aggregate.** Running a single file with `bun test path/to/file.test.ts` works; running the whole suite fails because a later file expects the real module but gets the earlier file's mock.
2. **Cross-test contamination can silently pass wrong assertions.** The mocked return value of an earlier file can satisfy an unrelated assertion in a later file, producing false positives rather than loud failures.

## Why

Bun implements module loading in native code with a single shared registry per process for speed (no transform-and-wrap-per-file like Jest). The mock hook writes into that registry directly. Undoing it would require per-test snapshots of the full registry, which Bun has not implemented.

## Counter / Caveats

- `spyOn(obj, 'method')` **is** properly undone by `mockRestore()` / `mock.restore()`. The incompatibility is only for `mock.module()`.
- For new tests, prefer refactoring code to accept dependency-injected fakes (or use `spyOn` on an imported namespace) so you never need `mock.module()` at all.
- This may be fixed in a future Bun version; verify current status before architecting around it.

## Evidence

- Archon root `CLAUDE.md`, "Test isolation (mock.module pollution)" section (lines 131-133).
- Archon root `CLAUDE.md`, "Mock isolation rules (IMPORTANT)" section (lines 625-630): explicit list of rules, including "Do NOT add `afterAll(() => mock.restore())` for `mock.module()` cleanup — it has no effect."
- Bun upstream issue: oven-sh/bun#7823 (referenced inline in CLAUDE.md).
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
