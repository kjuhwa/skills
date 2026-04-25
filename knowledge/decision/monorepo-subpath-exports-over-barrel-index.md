---
version: 0.1.0-draft
name: monorepo-subpath-exports-over-barrel-index
summary: T3Code uses explicit subpath exports (e.g., `@t3tools/shared/git`) instead of a single `index.ts` to reduce bundle size and improve tree-shaking
type: knowledge
category: decision
confidence: high
tags: [monorepo, design, exports]
source_type: extracted-from-git
source_url: https://github.com/pingdotgg/t3code.git
source_ref: main
source_commit: 9df3c640210fecccb58f7fbc735f81ca0ee011bd
source_project: t3code
imported_at: 2026-04-18
evidence:
  - package.json
  - packages/shared/src
  - .docs/workspace-layout.md
---

## Fact
T3Code's shared package does not have a barrel `index.ts`. Instead, `package.json` defines explicit subpath exports like `"./git"` and `"./DrainableWorker"`, each mapping to a separate file. Callers import explicitly: `import { GitCore } from '@t3tools/shared/git'`, not `import { GitCore } from '@t3tools/shared'`.

## Why it matters
1. **Smaller bundle** — bundlers can tree-shake unused exports because each export is isolated
2. **Clearer dependencies** — the import statement reveals which module is used; `from '@t3tools/shared'` is opaque
3. **Reduced startup time** — server startup does not load every utility in shared; only requested modules are imported
4. **Easier refactoring** — moving or renaming a module is localized; barrel index changes would affect many imports
5. **Avoids circular imports** — common source of bugs in large shared packages; subpath exports force acyclic dependency graphs

## Evidence
- `packages/shared/src` has files like `git.ts`, `DrainableWorker.ts`, `KeyedCoalescingWorker.ts` with no barrel `index.ts`
- Workspace layout doc says: "uses explicit subpath exports (e.g. `@t3tools/shared/git`, `@t3tools/shared/DrainableWorker`) — no barrel index"
- Package.json defines exports: `{ "./git": "./dist/git.js", ... }`

## How to apply
- In shared packages, avoid creating `index.ts`
- Each public module gets one file and one export entry in package.json
- If a module has sub-modules (e.g., `git/utils.ts`), still export from the parent: `"./git"` points to `git.ts`, not `git/index.ts`
- Document the public API in a README: list all subpath exports
- In tests, import from exact paths: `import { GitCore } from '@t3tools/shared/git'`
