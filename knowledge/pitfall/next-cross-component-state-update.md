---
version: 0.1.0-draft
name: next-cross-component-state-update
summary: React 19 forbids setState during render of a different component; defer zustand persist rehydrate calls and cross-component notifications to queueMicrotask.
category: pitfall
tags: [react-19, zustand, setstate, render, microtask]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: packages/core/platform/workspace-storage.ts
imported_at: 2026-04-18T00:00:00Z
---

React 19 strict mode throws a warning ("Cross-component updates during render") when component A's render calls `setState` on component B's store. This happens accidentally when:

- A global setter (e.g. `setCurrentWorkspace(slug, id)`) is invoked during a component's render.
- The setter synchronously calls `store.persist.rehydrate()` which internally calls `setState` on another store.

Fix: defer the side effect to `queueMicrotask`, batching multiple calls in the same render cycle into one microtask:

```ts
let _pendingRehydrate = false;
export function setCurrentWorkspace(slug, wsId) {
  if (_currentSlug === slug) return;
  _currentSlug = slug;
  if (!_pendingRehydrate) {
    _pendingRehydrate = true;
    queueMicrotask(() => {
      _pendingRehydrate = false;
      for (const fn of _rehydrateFns) fn();
    });
  }
}
```

## Why

Microtask runs after the current render commits but before the browser paints — effectively batching updates without user-visible delay. Repeat calls with the same slug are no-ops so rapid desktop tab re-mounts (N tabs each calling setCurrentWorkspace on mount) coalesce to one microtask.

Without deferring, tests pass (they often bypass the render cycle) but the dev console warning is always there, and occasionally the deferred work clobbers state that the in-render setState was about to set.

## Evidence

- `packages/core/platform/workspace-storage.ts:30-64` — explicit microtask comment.
