---
version: 0.1.0-draft
name: workspace-identity-not-cleared-on-unmount
summary: A global "current workspace" singleton set on route mount must be explicitly cleared before leaving workspace context; unmount does not clear it.
category: pitfall
tags: [state-management, workspace, race-condition, realtime]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLAUDE.md
imported_at: 2026-04-18T00:00:00Z
---

When a global identity singleton (e.g. `setCurrentWorkspace(slug, uuid)`) feeds three independent consumers — API client headers, persist storage namespace, and top-chrome rendering gate — destructive flows (leave workspace, delete workspace, force-navigate to overlay) MUST call `setCurrentWorkspace(null, null)` explicitly before the mutation fires. Relying on route unmount to clear it creates a race: the realtime `workspace:deleted` handler invalidates cache while chrome gating is still truthy, and a workspace-ID-requiring hook throws.

## Why

The correct destructive order is: read destination → clear singleton → navigate → mutate. Reversing the order (mutate first, then navigate) causes a three-way race between the mutation's `onSettled` invalidate, the explicit navigate, and the realtime handler's relocate — all refetching the same workspace list concurrently. One call is cancelled and bubbles as `CancelledError`, triggering a full renderer reload.

## Evidence

- CLAUDE.md, "Workspace identity singleton" and "Workspace destructive operations" sections.
- `packages/core/platform/workspace-storage.ts` — `setCurrentWorkspace` and paired singletons.
- `packages/core/workspace/mutations.ts` — correct mutation ordering.
