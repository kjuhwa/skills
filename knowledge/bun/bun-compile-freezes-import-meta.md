---
version: 0.1.0-draft
name: bun-compile-freezes-import-meta
summary: Inside a `bun build --compile` binary, `import.meta.url` and `import.meta.dir` are frozen to the build host's filesystem path and point to nothing on the user's machine.
category: bun
confidence: high
tags: [bun, compile, import-meta, native-binary, gotcha]
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
linked_skills: [bun-compile-binary-resolve]
---

# `bun build --compile` Freezes `import.meta.*`

## Fact / Decision

When a JS/TS source is compiled into a single Bun binary with `bun build --compile`, any references to `import.meta.url` and `import.meta.dir` are resolved **at build time** and baked into the binary. On the user's machine at runtime, those values point at a path that exists only on the build host (e.g. `/home/ci-runner/workspace/packages/foo/src/index.ts`).

This breaks three common patterns silently:

1. **`createRequire(import.meta.url)`** — node_modules-relative lookup ends up pointing to the build host, so packages that ship native sibling binaries and locate them this way (e.g. `@openai/codex-sdk` locating the Codex CLI binary) cannot find their assets.
2. **`fileURLToPath(import.meta.url)` + relative joins** — same issue; the resulting path doesn't exist.
3. **`new URL('./asset.json', import.meta.url)` for filesystem reads** — points at a non-existent location.

The freeze is a by-product of `bun build --compile`'s single-file model: there is no filesystem to anchor to. Bun provides `Bun.embeddedFiles` / `import X from '...' with { type: 'text' }` for content that should ship inside the binary; anything that must be **external** at runtime needs its own resolver.

## Why

Compile mode packs every source module's transpiled output and its `import.meta` metadata into the executable as compile-time constants. Dynamically rewriting these at launch would require the binary to know its own filesystem origin, which it can't guarantee (the binary is a single file that can be copy/moved anywhere).

## Counter / Caveats

- **Dev mode** (plain `bun run`) resolves `import.meta.*` normally against the real filesystem. Any workaround you add must be gated on a build-time constant (e.g. `BUNDLED_IS_BINARY`) so dev mode keeps working.
- The symptom in a compiled binary is usually **not** a crash at startup — it's a runtime error deep inside an SDK's binary-resolution path, long after the user ran the command. Log early, fail loud.
- Archon's earlier approach was runtime heuristics to detect compile mode; that was replaced with the `BUNDLED_IS_BINARY` build-time flag per issue #979 because the heuristics were brittle across Bun's ESM/CJS compile modes.

## Evidence

- `packages/providers/src/codex/binary-resolver.ts`:1-16 — comment explains the `createRequire(import.meta.url)` failure and the resolver workaround.
- `packages/paths/src/bundled-build.ts`:1-19 — the `BUNDLED_IS_BINARY` / `BUNDLED_VERSION` / `BUNDLED_GIT_COMMIT` constants, noted as replacing "runtime detection heuristics that were brittle across Bun's ESM/CJS compile modes."
- Archon GitHub issue #979 (referenced in `bundled-build.ts:13`).
- Archon GitHub issue #960 (referenced in `packages/paths/src/logger.ts`:54 for a related compile-mode bug in `pino-pretty`'s `require.resolve`).
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
