---
version: 0.1.0-draft
name: transpile-packages-over-publish
summary: Use transpilePackages in Next.js (and equivalent in Vite) to consume raw-source monorepo packages directly — no build step, no publish step, no dist.
category: decision
tags: [nextjs, transpile, monorepo, build, packages]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: apps/web/next.config.ts
imported_at: 2026-04-18T00:00:00Z
---

For a monorepo where shared packages export raw TypeScript source (no build step), consuming apps must be configured to compile those packages themselves.

Next.js:
```ts
// next.config.ts
export default {
  transpilePackages: ["@org/core", "@org/ui", "@org/views"],
};
```

Vite / electron-vite: workspace packages are auto-transpiled by the TypeScript plugin; no explicit config needed, but ensure `paths` in the tsconfig resolve to source.

## Why

Tradeoff: apps pay the transpile cost at build time (and during HMR dev), but dev loop gets zero-config HMR and instant go-to-definition across package boundaries. There's no stale dist to invalidate, no sourcemap mismatch, no "forgot to rebuild the package" bugs.

This only works for internal packages. Anything you plan to publish to npm must build to dist and publish the dist — consumers outside the monorepo don't have a TS-aware bundler.

## Evidence

- `apps/web/next.config.ts` (referenced) — uses transpilePackages.
- `CLAUDE.md` "Internal Packages pattern" decision.
