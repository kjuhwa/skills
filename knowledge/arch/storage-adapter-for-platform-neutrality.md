---
version: 0.1.0-draft
name: storage-adapter-for-platform-neutrality
summary: Shared packages depend on a StorageAdapter interface, not on localStorage — each platform injects its own adapter (browser localStorage, Electron store, in-memory for tests).
category: arch
tags: [storage, cross-platform, adapter, electron, testing]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: packages/core/platform/workspace-storage.ts
imported_at: 2026-04-18T00:00:00Z
---

Shared persist layer defines a narrow interface:

```ts
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
```

Each consuming app registers its own adapter:
- Web browser: thin wrapper around `window.localStorage`.
- Electron renderer: IPC to main-process `electron-store`.
- Tests: in-memory Map wrapper.
- SSR: no-op wrapper that returns null on every read.

## Why

If `packages/core/` imported `localStorage` directly, it couldn't run in SSR, Node tests, or the Electron main process. Abstracting away via an adapter keeps core framework-neutral. The adapter is injected by the platform-bridge provider on app boot, before any Zustand store hydrates.

Pairs naturally with `createWorkspaceAwareStorage(adapter)` — that function adds namespacing on top of whatever adapter was injected, so the workspace-aware logic is also platform-neutral.

## Evidence

- `packages/core/platform/storage.ts` — StorageAdapter interface.
- `packages/core/platform/workspace-storage.ts:98-107` — adapter consumer.
- CLAUDE.md "Package Boundary Rules" — `zero localStorage (use StorageAdapter)` constraint.
