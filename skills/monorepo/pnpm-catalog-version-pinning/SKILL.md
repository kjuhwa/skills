---
name: pnpm-catalog-version-pinning
description: Use pnpm's catalog: references in pnpm-workspace.yaml to guarantee a single version of shared deps across all monorepo packages.
category: monorepo
version: 1.0.0
tags: [pnpm, monorepo, versioning, workspace, react]
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

- Pnpm workspace with 3+ packages that share React, TypeScript, Vitest, or any UI library.
- You've hit "two Reacts" bugs (duplicate hook-state errors, `Invalid hook call`, hook-order mismatch).
- You want upgrading React to be a one-file change, not N package.json edits.

## Steps

1. In `pnpm-workspace.yaml`, declare shared versions under a `catalog:` block:
   ```yaml
   packages:
     - "apps/*"
     - "packages/*"
   catalog:
     react: "19.2.3"
     react-dom: "19.2.3"
     typescript: "^5.9.3"
     "@tanstack/react-query": "^5.96.2"
     zustand: "^5.0.0"
     vitest: "^4.1.0"
   ```
2. In every package.json that consumes these deps, reference the catalog instead of pinning versions:
   ```json
   {
     "dependencies": {
       "react": "catalog:",
       "react-dom": "catalog:",
       "@tanstack/react-query": "catalog:"
     }
   }
   ```
3. For types that must match React majors (common source of "two Reacts"), add a pnpm override in the root `package.json`:
   ```json
   "pnpm": {
     "overrides": {
       "@types/react": "catalog:",
       "@types/react-dom": "catalog:"
     }
   }
   ```
4. Run `pnpm install` to regenerate the lockfile. All packages now resolve to the single catalog version.
5. To upgrade React across the monorepo, change one line in `pnpm-workspace.yaml` and reinstall.

## Example

Upgrade TanStack Query from 5.96 to 5.100:

```diff
 catalog:
-  "@tanstack/react-query": "^5.96.2"
+  "@tanstack/react-query": "^5.100.0"
```

No package.json touches. No drift. `pnpm why @tanstack/react-query` shows one version across all packages.
