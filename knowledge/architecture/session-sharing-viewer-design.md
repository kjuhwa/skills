---
version: 0.1.0-draft
name: session-sharing-viewer-design
summary: Craft Agents ships a separate apps/viewer Vite app that renders read-only session snapshots shared via agents.craft.do/s/:id — a published-session artifact export with no backend dependency at view time.
category: architecture
tags: [session-sharing, viewer, read-only, static-export]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: apps/viewer
imported_at: 2026-04-18T00:00:00Z
---

# Session sharing via a separate viewer app

### Design
`apps/viewer` is a standalone Vite-built React app that renders a session snapshot from a published URL (e.g. `https://agents.craft.do/s/tz5-13I84pwK_he`). It's entirely separate from the Electron app:
- Own `vite.config.ts`, own package.json, own build (`bun run viewer:build`).
- No WebSocket, no RPC client — pure static fetch of the published JSON bundle.
- Shares UI components with the main renderer through `@craft-agent/ui` workspace package.

### Why separate
- **Caching / CDN**: a static viewer can be cached globally with very long TTLs. Sessions are immutable once shared.
- **Zero auth**: public share links need to work without any login. Keeping the viewer out of the main app means no accidental RPC leakage.
- **Bundle size**: a share viewer doesn't need the permission system, session manager, skill picker, OAuth flows. Smaller = faster first paint.
- **Dev iteration**: `bun run viewer:dev --open /s/tz5-13I84pwK_he` loads an example session directly without running any server.

### Snapshot format
When a user shares, the app exports the session JSONL + any referenced `long_responses/` blobs into a single JSON bundle (a `SessionBundle`). See `packages/shared/src/sessions/bundle.ts`. The viewer reconstructs the messages from this bundle.

### Trade-offs
- Duplicate rendering paths for session messages (renderer AND viewer). Mitigated by shared `@craft-agent/ui` components that take a `SessionMessage` prop.
- Viewer can't replay live events (it's a snapshot); links to in-progress sessions don't work.
- Branding / theming must be built into the viewer bundle; users can't pass their custom theme.

### Related: apps/webui
`apps/webui` is a DIFFERENT standalone React app that DOES talk to the server via WebSocket (not static). It's the "browser version of the Electron app" for headless-server users. Keep them straight: `viewer/` is read-only public, `webui/` is full-featured authenticated.

### Reference
- `apps/viewer/src/App.tsx`
- `packages/shared/src/sessions/bundle.ts` (bundle format + export)
- `package.json#scripts` for `viewer:build`, `viewer:dev`, `viewer:preview`, `webui:build`
