---
name: effect-ts-monorepo-with-turbo-and-subpath-exports
description: Organize effect-based services in a monorepo using Turbo task pipelines and explicit subpath exports instead of barrel indexes
category: monorepo
version: 1.0.0
version_origin: extracted
confidence: high
tags: [monorepo, effect-ts, turbo, typescript]
source_type: extracted-from-git
source_url: https://github.com/pingdotgg/t3code.git
source_ref: main
source_commit: 9df3c640210fecccb58f7fbc735f81ca0ee011bd
source_project: t3code
imported_at: 2026-04-18
evidence:
  - package.json
  - turbo.json
  - packages/shared/src
  - .docs/workspace-layout.md
---

## When to Apply
- You have 4+ packages in a Bun/Node monorepo with Effect.ts services
- You want to avoid barrel index files (e.g., `index.ts` exporting everything)
- You need lazy-loading and want to control import surface area per package
- You're using Turbo for task orchestration and need deterministic builds

## Steps
1. Structure as `apps/{server,web,desktop}` and `packages/{contracts,shared,client-runtime}`
2. In `packages/*/package.json`, define `exports` with subpath mappings:
   ```json
   {
     "exports": {
       "./git": "./dist/git.js",
       "./DrainableWorker": "./dist/DrainableWorker.js"
     }
   }
   ```
3. Each subpath is a separate file, not re-exported from `index.ts`
4. Consumers import explicitly: `import { GitCore } from '@t3tools/shared/git'`
5. In `package.json` root, define `catalog` with common dependency versions (effect, typescript, etc.)
6. Use `overrides` to enforce catalog versions across workspace
7. Define `turbo.json` with task dependency DAG: `build -> test`, `typecheck` in parallel
8. Add `bun` as `packageManager` and pin versions in `engines`

## Example
```json
{
  "workspaces": { "packages": ["apps/*", "packages/*"] },
  "catalog": { "effect": "4.0.0-beta.45", "typescript": "^5.7.3" },
  "overrides": { "effect": "catalog:", "typescript": "catalog:" },
  "packageManager": "bun@1.3.11"
}
```

## Counter / Caveats
- Subpath exports require explicit `package.json` maintenance per file
- Bundler/TypeScript LSP may not resolve subpaths in dev; test early
- Turbo cache can become stale if tasks mutate inputs; use immutable inputs/outputs
- Catalog overrides may conflict with transitive deps; audit carefully
