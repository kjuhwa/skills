---
version: 0.1.0-draft
name: package-boundary-hard-rules
summary: Monorepo package boundaries are hard constraints — violating them breaks cross-platform architecture.
category: arch
tags: [monorepo, package-boundaries, react, electron, nextjs]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLAUDE.md
imported_at: 2026-04-18T00:00:00Z
---

For a web-plus-desktop-plus-shared-code monorepo, enforce these as hard rules, not suggestions:

- `packages/core/` — zero react-dom, zero localStorage (use a StorageAdapter), zero `process.env`, zero UI libraries. All shared Zustand stores live here, even view-related ones (filters, view modes), because stores are pure state, not UI.
- `packages/ui/` — zero imports from the core package (pure UI, no business logic).
- `packages/views/` — zero `next/*` imports, zero `react-router-dom` imports, zero stores. Use a `NavigationAdapter` for all routing.
- `apps/web/platform/` — the only place for Next.js APIs (`next/navigation`).
- `apps/desktop/src/renderer/src/platform/` — the only place for `react-router-dom` navigation wiring.

## Why

Once `packages/views/` imports `next/navigation`, the desktop app (which has no Next.js) can no longer consume that view. Once `packages/core/` touches `localStorage`, it can no longer run on the desktop main process, in tests, or in SSR. The "platform/" folder in each app is the single escape hatch where framework-specific APIs are allowed; shared code passes through adapters (`NavigationAdapter`, `StorageAdapter`) injected by the platform layer.

The no-duplication rule complements this: if the same logic exists in both apps, extract it. When the two apps need different behavior, use props/slots on a shared component, not duplicate logic.

## Evidence

- CLAUDE.md, "Package Boundary Rules" and "The No-Duplication Rule".
- `packages/core/platform/storage.ts` — the `StorageAdapter` interface.
- `packages/core/platform/workspace-storage.ts` — adapter-based workspace storage.
