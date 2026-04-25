---
name: powersync-custom-sharedworker-override
description: Ship a custom SharedWorker that extends PowerSync's internal SharedSyncImplementation so you can inject a custom BucketStorageAdapter (e.g. a TransformableBucketStorage) without giving up multi-tab sync efficiency.
category: powersync
confidence: high
version: 1.0.0
version_origin: extracted
source_type: extracted-from-git
source_url: https://github.com/thunderbird/thunderbolt.git
source_ref: main
source_commit: 9d9c18ba511decfd3b45fc0f72c265d83355fe95
source_project: thunderbolt
imported_at: 2026-04-18T00:00:00Z
tags: [powersync, sharedworker, vite, sqlite, e2e-encryption]
linked_knowledge: [powersync-sharedworker-multi-tab-constraint]
---

## When to use

You run PowerSync on Chrome/Edge/Firefox with `enableMultiTabs: true`, and you need the SharedWorker to use a custom `BucketStorageAdapter` (e.g. to decrypt sync data). The default SharedWorker hardcodes `new SqliteBucketStorage(...)` and ignores any adapter you configure on the main thread.

## Steps

1. Add a Vite alias and matching `tsconfig.json` `paths` entry named `powersync-web-internal` pointing at `node_modules/@powersync/web/lib/src`. `SharedSyncImplementation` is `@internal` and not in the public exports map, so you need the compiled lib path.
2. Subclass `SharedSyncImplementation` and override only `generateStreamingImplementation()` — the one `protected` method that controls which storage adapter is used. Copy the parent body, replace `new SqliteBucketStorage(...)` with `new TransformableBucketStorage(...)` and attach your middleware before returning.
3. Write a SharedWorker entry file that mirrors PowerSync's original `SharedSyncImplementation.worker.ts` but instantiates your subclass.
4. Wire it up in the PowerSync database config: `sync: { worker: () => new SharedWorker(new URL('./worker/YourSharedSyncImplementation.worker.ts', import.meta.url), { type: 'module', name: 'shared-sync-<dbFilename>' }) }`. Vite detects this pattern and bundles the worker as a separate ES module chunk.
5. Access side-channel data (like content keys) directly from IndexedDB inside the worker — transformer functions cannot be passed in at runtime because Comlink cannot serialize closures.
6. Every time you upgrade `@powersync/web`, diff `SharedSyncImplementation.generateStreamingImplementation()` against your override; silent API drift is the main failure mode.

## Counter / Caveats

- Safari / iOS / Tauri cannot run this path: `OPFSCoopSyncVFS` does not support SharedWorker, Tauri's `tauri://` protocol blocks `import.meta.url`-based worker loading, and iOS WKWebView crashes with SharedWorker. Keep `enableMultiTabs: false` + the main-thread transformer path for those environments.
- Using an internal import path trades public-API stability for feature access. Upgrades of `@powersync/web` may silently move or rename files without TypeScript errors because the path is string-aliased.
- Any middleware you need at runtime must be importable from worker code — no closures, no factory parameters, no runtime registration from the main thread.

## Evidence

- `docs/powersync-sync-middleware.md:136-207` — why the multi-tab constraint exists and how the override works
- `src/db/powersync/worker/ThunderboltSharedSyncImplementation.ts` — the subclass
- `src/db/powersync/worker/ThunderboltSharedSyncImplementation.worker.ts` — the worker entry
- `vite.config.ts:73-82` — `powersync-web-internal` alias
