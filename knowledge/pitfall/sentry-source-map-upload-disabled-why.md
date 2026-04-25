---
version: 0.1.0-draft
name: sentry-source-map-upload-disabled-why
summary: Sentry source map upload is intentionally disabled in Craft Agents; re-enabling requires adding @sentry/esbuild-plugin to the main-process build AND keeping the renderer path via @sentry/vite-plugin — two plugins, two builds, two auth tokens.
category: pitfall
tags: [sentry, source-maps, electron, observability]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: scripts/electron-build-main.ts
imported_at: 2026-04-18T00:00:00Z
---

# Why Craft Agents ships without Sentry source maps

### What's disabled
Source map upload to Sentry is intentionally turned off. Stack traces in Sentry show bundled / minified code. `beforeSend` still scrubs secrets (see `sentry-beforesend-scrub-secrets` skill) and events still flow — it's only the symbolication that's off.

### Why it's disabled
- CI auth tokens needed: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
- Two different build pipelines need different Sentry plugins:
  - Renderer (Vite): `@sentry/vite-plugin`.
  - Main process (esbuild): `@sentry/esbuild-plugin`.
- The main-process plugin wasn't configured; shipping renderer-only source maps is worse than none (half-symbolicated stack traces are confusing).

### What the comment says
From `scripts/electron-build-main.ts`:
> NOTE: Sentry source map upload is intentionally disabled for the main process.
> To enable in the future, add @sentry/esbuild-plugin. See apps/electron/CLAUDE.md.

### To re-enable
1. Add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` to CI secrets.
2. Add `@sentry/esbuild-plugin` to `scripts/electron-build-main.ts` esbuild config.
3. Re-enable `@sentry/vite-plugin` in `apps/electron/vite.config.ts` (it's guarded by a feature flag currently).
4. Ensure the DSN is available for both main and renderer. (Main reads it at build time via the existing `--define`; renderer has its own channel.)

### Lesson
If you're going to use source maps with an Electron app, plan to set up BOTH bundler pipelines up front. Retrofitting after the fact means you ship errors-without-maps for months and desensitize your team to stack-trace quality.

### Observability without source maps
- Use `beforeSend` + `beforeBreadcrumb` to add semantic tags (feature flag, permission mode, provider) so you can filter errors without needing symbolication.
- Log tool-name + parameters explicitly; "unhandled error in /agent/tool/Bash" is more useful than a stack trace pointing at webpack chunk offset 0x...

### Reference
- `scripts/electron-build-main.ts` — top-of-file comment.
- `apps/electron/src/main/index.ts` — Sentry init + beforeSend.
- `apps/electron/vite.config.ts` — where the renderer plugin would go.
