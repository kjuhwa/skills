---
name: internal-raw-source-packages
description: Set up shared monorepo packages that export raw .ts/.tsx files so consuming apps' bundlers compile them directly — zero build step, instant HMR, cross-package go-to-definition.
category: monorepo
version: 1.0.0
tags: [monorepo, pnpm, typescript, turbo, hmr]
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

## When to use

- Pnpm monorepo with 2+ frontend apps sharing code in `packages/*`.
- You want fast dev iteration (HMR across package boundaries, no stale dist).
- All consuming apps have TypeScript-aware bundlers (Next.js, Vite, electron-vite, tsx).

## Steps

1. Structure the package with no build step:
   ```
   packages/core/
     package.json
     tsconfig.json
     src/
       index.ts
       feature-a/
       feature-b/
   ```
2. In `packages/core/package.json`, point `main` / `types` directly at source. No `build` script:
   ```json
   {
     "name": "@org/core",
     "version": "0.0.0",
     "private": true,
     "main": "./src/index.ts",
     "types": "./src/index.ts",
     "exports": {
       ".": "./src/index.ts",
       "./auth": "./src/auth/index.ts"
     }
   }
   ```
3. In consuming app configs, mark these packages as transpiled. For Next.js:
   ```ts
   // next.config.ts
   export default {
     transpilePackages: ["@org/core", "@org/ui", "@org/views"],
   };
   ```
   For Vite / electron-vite, workspace packages are auto-transpiled via the TS plugin; no extra config.
4. Add a shared `tsconfig` package (`packages/tsconfig`) with base configs that per-package tsconfigs extend — keeps `strict`, `moduleResolution: bundler`, `paths` consistent.
5. Turbo pipeline: typecheck and test run in dependency order; `build` still runs only for apps, not for shared packages.
   ```json
   {
     "tasks": {
       "build":     { "dependsOn": ["^build"] },
       "typecheck": { "dependsOn": ["^typecheck"] },
       "test":      { "dependsOn": ["^typecheck"] }
     }
   }
   ```

## Example

```
apps/web/next.config.ts → transpilePackages: ["@org/core", "@org/ui", "@org/views"]
apps/web/app/page.tsx   → imports @org/views/issues
packages/views/         → imports @org/core
packages/core/          → pure logic, no DOM
```

Dev loop: edit `packages/core/issues/queries.ts`, the Next.js HMR picks it up in under a second. `go-to-definition` jumps straight to the source file.

## Caveats

- Type errors in a shared package surface at app build time, not at package publish time. Treat `typecheck` as a first-class CI gate.
- You cannot publish these packages to npm as-is (they're raw TS). This is fine for internal packages; if you need to publish, add a build step to that one package only.
