---
name: bun-workspaces-export-map
description: Expose a deep subpath export map ('./agent', './config/types', './utils/paths', ...) from a shared workspace package so consumers import stable, internal-hidden surfaces instead of reaching into src directly.
category: tooling
version: 1.0.0
version_origin: extracted
tags: [monorepo, bun, workspaces, package-exports, tree-shaking]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/shared/package.json
imported_at: 2026-04-18T00:00:00Z
---

# Deep subpath export map for shared workspace packages

## When to use
- Monorepo where one large `@scope/shared` package exports many domains (agent, auth, config, sessions, sources).
- Consumers currently import from deep relative paths or single `index.ts` barrel (risk of circular deps + bundling all of it).
- Want a stable public surface you can refactor behind.

## How it works
1. In the shared package's `package.json`, use the `exports` field with named subpaths:
   ```json
   "exports": {
     ".":                      "./src/index.ts",
     "./agent":                "./src/agent/index.ts",
     "./agent/mode-types":     "./src/agent/mode-types.ts",
     "./auth":                 "./src/auth/index.ts",
     "./config":               "./src/config/index.ts",
     "./config/types":         "./src/config/types.ts",
     "./sessions":             "./src/sessions/index.ts",
     "./sources":              "./src/sources/index.ts",
     "./protocol":             "./src/protocol/index.ts"
   }
   ```
2. Consumers import from the named paths:
   ```ts
   import { CraftAgent } from '@craft-agent/shared/agent';
   import { PermissionMode } from '@craft-agent/shared/agent/mode-types';
   ```
3. TypeScript resolves via `moduleResolution: 'bundler'` or `'nodenext'`.
4. Not-listed paths are INVISIBLE to consumers - refactoring internals doesn't break them.
5. Bundlers (Vite, esbuild) honor the map for correct tree-shaking; they load only `agent/index.ts` when that subpath is imported.

## Example
Consumer side:
```ts
// Good
import { handleDeepLink } from '@craft-agent/shared/agent';
import { parsePermissionMode } from '@craft-agent/shared/agent/mode-types';

// Bad (reaches into internals, breaks when you move files)
import { handleDeepLink } from '@craft-agent/shared/src/agent/internals/foo.ts';
```

## Gotchas
- Consumers who ignored your intent and imported from `src/` will break the day you add an exports map - do this BEFORE you have many consumers.
- Each subpath needs its own `index.ts` barrel file. Keep them minimal - re-exports only.
- TS `paths` in the consumer's tsconfig can override the exports map; don't.
- If you ship both ESM and CJS, use conditional exports: `{ "import": "./x.mjs", "require": "./x.cjs" }`.
- In Bun workspaces, TS source files (`.ts`) resolve directly without a build step - the export map points at source files.
