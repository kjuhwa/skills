---
version: 0.1.0-draft
name: file-layout-apps-vs-packages
summary: apps/ hold leaf-node deployables (cli, electron, viewer, webui); packages/ hold reusable libraries (core, shared, server-core, server, session-tools-core, session-mcp-server, pi-agent-server, ui) — a crisp boundary between "ships to users" and "imported by ships".
category: reference
tags: [monorepo, layout, convention]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: package.json
imported_at: 2026-04-18T00:00:00Z
---

# apps/ vs packages/ layout

The monorepo enforces a strict distinction:

### `apps/` — user-facing deployables
- `apps/cli/` — terminal client (craft-cli). `bun run` entry + `bun link` binary.
- `apps/electron/` — the desktop GUI. Built with esbuild (main/preload) + Vite (renderer).
- `apps/viewer/` — read-only session snapshot viewer (shared session URLs). Static Vite build.
- `apps/webui/` — full-featured browser UI for the headless server. Vite build.
- (Internal only, OSS excludes: `apps/marketing/`, `apps/online-docs/` via `!apps/online-docs`.)

Characteristics:
- Has its own `bun run <app>:build` / `<app>:dev` / `<app>:preview` scripts in root `package.json`.
- Depends on `@craft-agent/shared`, `@craft-agent/ui`, etc.
- Never imported by other apps.
- Each has a `package.json` with top-level metadata (appId, version).

### `packages/` — shared libraries
- `packages/core/` — type-only. Shared TypeScript types used across.
- `packages/shared/` — business logic (agent, auth, config, credentials, mcp, sessions, sources, skills).
- `packages/server-core/` — RPC transport, bootstrap, handler utilities.
- `packages/server/` — standalone Bun server entry that uses server-core + shared.
- `packages/session-tools-core/` — backend-agnostic session tool handlers.
- `packages/session-mcp-server/` — stdio MCP server wrapping session-tools-core (for Codex).
- `packages/pi-agent-server/` — subprocess for Pi SDK sessions.
- `packages/ui/` — shared React components (used by electron renderer + webui + viewer).

Characteristics:
- Published via workspace protocol (`"workspace:*"`) — no npm publish needed for internal use.
- Each exposes a selective `exports` map (see `@craft-agent/shared` — 30+ subpaths).
- No CLI, no main-binary concept; imported by apps or other packages.

### Why the split matters
- **Build targeting**: `scripts/build-server.ts` copies only `packages/*` source for the server dist; apps/ (including Electron, which you don't want on a server) are skipped entirely.
- **Type-checking tiers**: `bun run typecheck:all` runs `tsc` in each package in topological order; apps come last.
- **Dependency discipline**: packages can only depend on other packages. Apps depend on packages. An app never depends on an app. Enforced by code review + mental model, not tooling.

### Reference
- `package.json#workspaces`
- `tsconfig.json` (references to package paths)
- `scripts/build-server.ts` — SERVER_PACKAGES allowlist mirrors the distinction.
