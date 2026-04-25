---
version: 0.1.0-draft
name: desktop-route-categories
summary: Every path in a tab-based Electron desktop app falls into exactly one of three categories — session routes, transition flows (overlays), or error/stale states (auto-healed).
category: decision
tags: [electron, desktop, routing, tabs, overlay]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLAUDE.md
imported_at: 2026-04-18T00:00:00Z
---

Every URL/path in the desktop app must fall into exactly one category. Picking the wrong one reproduces bugs you've already fixed.

- **Session routes** — workspace-scoped pages (`/:slug/issues`, `/:slug/settings`). Rendered by the per-tab memory router under `WorkspaceRouteLayout`. These are legitimate tab destinations.
- **Transition flows** — pre-workspace / one-shot actions (create workspace, accept invite). NOT routes. They live as `WindowOverlay` state, dispatched when the navigation adapter sees a magic path (`push('/workspaces/new')` or `push('/invite/<id>')`). Shared view (`NewWorkspacePage`, `InvitePage`) is the content; the overlay wrapper supplies platform chrome.
- **Error/stale states** — "workspace not available", tabs pointing at a revoked workspace. NOT pages. `WorkspaceRouteLayout` auto-heals by dropping the stale tab group from the store; the user never lands on an explicit error screen. Web keeps `NoAccessPage` (shareable URL makes the error state meaningful); desktop has no URL bar so stale = heal silently.

## Why

Desktop has different constraints from web: no URL bar, per-tab memory router, tabs grouped per workspace, and a native title bar that requires a drag strip. Treating all paths as "routes" imports web-centric assumptions that don't fit. Error screens in particular are meaningless on desktop because the user can't paste a URL to reach them; auto-heal is better UX.

Adding a new pre-workspace flow on desktop: register a new `WindowOverlay` type in `stores/window-overlay-store.ts`. Do NOT add it to `routes.tsx`. If the flow appears on both platforms, add the route on web AND the overlay type on desktop — the shared view component stays identical.

## Evidence

- CLAUDE.md, "Desktop-specific Rules" → "Route categories" section.
- Desktop `routes.tsx` vs `stores/window-overlay-store.ts` split.
