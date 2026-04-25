---
version: 0.1.0-draft
name: internal-packages-raw-source-pattern
summary: Shared monorepo packages export raw .ts/.tsx files (no pre-compilation); consuming app bundlers compile them directly.
category: arch
tags: [monorepo, pnpm, turbo, typescript, build]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLAUDE.md
imported_at: 2026-04-18T00:00:00Z
---

All shared packages in this monorepo (core, ui, views, tsconfig) export raw `.ts`/`.tsx` source with no build step. The consuming app's bundler (Next.js, Vite, electron-vite) compiles them directly.

## Why

This gives zero-config HMR and instant go-to-definition across package boundaries. No tsup/rollup build to keep in sync, no stale `dist/` to invalidate, no source-map mismatch. The tradeoff is that every consuming app must have a TypeScript-aware bundler configured for workspace packages, and type errors in shared code surface at app build time rather than at package publish time.

Works in tandem with pnpm's `catalog:` references (`pnpm-workspace.yaml`) so that all packages pin the same React, TypeScript, Vitest versions. If two packages disagree, React would double-instantiate and hooks would break silently.

## Evidence

- CLAUDE.md, "Key Architectural Decisions" → "Internal Packages pattern".
- `pnpm-workspace.yaml:5-38` — catalog block with pinned versions.
- `packages/*/package.json` — no `build` script, `main` points at `src/index.ts`.
