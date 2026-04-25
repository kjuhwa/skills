---
version: 0.1.0-draft
name: why-bun-not-node
summary: Why Craft Agents standardized on Bun for the server + CLI but keeps Electron on Node — startup speed, single-file bundling for subprocesses, TypeScript without build step, but Electron can't swap its renderer runtime.
category: architecture
tags: [bun, node, runtime-choice, electron]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: package.json
imported_at: 2026-04-18T00:00:00Z
---

# Why Bun, but only where it fits

Craft Agents uses Bun for:

- **Server binary**: `packages/server/src/index.ts`. Runs raw TypeScript via `bun run`, no transpile step, fast cold start (sub-100ms). Sentry-style uncaught-rejection handling is needed because Bun is stricter than Node (terminates on unhandled rejection by default — see `process.on('unhandledRejection')` guard at top of `packages/server/src/index.ts`).
- **CLI** (`apps/cli`) and scripts (`scripts/*.ts`) for the same reason — TS-as-source, `Bun.spawn`, `Bun.file`, `$ ` template literal.
- **Build tools**: `scripts/build-server.ts` uses Bun's `$` shell for `tar -czf`, and Bun's subprocess API for parallel bundles.
- **Pi agent subprocess** (`packages/pi-agent-server`) bundled with `bun build --target=bun --format=esm --external koffi` because the Pi SDK is ESM-only and esbuild's `packages:external` breaks ESM resolution.

Craft Agents uses Node for:

- **Electron main/preload/renderer**: Electron embeds Node (not Bun). You can't swap. The app's main process is therefore bundled with esbuild targeting Node.
- **Session MCP server** and the fetch interceptor shim: bundled as CJS with `bun build --target=node --format=cjs` so they can be required from Electron (Node) OR Bun.

### Forced choices
- **Lockfile**: `bun.lock` in repo root — Bun's new text-based lockfile (readable, mergeable).
- **Workspaces**: `workspaces: ['packages/*', 'apps/*', '!apps/online-docs']`. Bun resolves workspace aliases natively; no `pnpm` / `npm link` dance.
- **Type-only packages**: `@craft-agent/core` is pure types; both Node + Bun consume them unmodified.

### Annoyances
- Some npm packages expect Node-specific APIs (e.g. `electron-builder`'s internal child_process calls). Those stay on Node.
- `bun --preload` doesn't accept every CJS file verbatim (top-level await in ESM breaks); this forced the CJS-bundled interceptor pattern.
- Bun's `Subprocess` stderr/stdout are `ReadableStream` — not Node's `Readable` — so helpers have to branch when they target both.

### Takeaway
Pick Bun for anything you control end-to-end (CLI, scripts, server). Stick with Node where the host forces it (Electron, some packaged-app cross-platform quirks). Bundle shared code as CJS so either runtime can consume it.
