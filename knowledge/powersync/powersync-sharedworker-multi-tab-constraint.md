---
version: 0.1.0-draft
name: powersync-sharedworker-multi-tab-constraint
description: When `enableMultiTabs: true` (the default on Chrome/Edge/Firefox), PowerSync spawns a SharedWorker that manages a sin...
type: knowledge
category: pitfall
confidence: high
source: thunderbolt/docs/powersync-sync-middleware.md
source_type: extracted-from-git
source_url: https://github.com/thunderbird/thunderbolt.git
source_ref: main
source_commit: 9d9c18ba511decfd3b45fc0f72c265d83355fe95
source_project: thunderbolt
imported_at: 2026-04-18T00:00:00Z
linked_skills: [powersync-custom-sharedworker-override, powersync-transformable-bucket-storage]
tags: [powersync, sharedworker, sqlite, comlink, vite]
---

# PowerSync SharedWorker ignores main-thread BucketStorageAdapter

When `enableMultiTabs: true` (the default on Chrome/Edge/Firefox), PowerSync spawns a SharedWorker that manages a single sync connection across tabs. The SharedWorker creates its own `SqliteBucketStorage` instance inside `SharedSyncImplementation.generateStreamingImplementation()` and **completely ignores** any custom `BucketStorageAdapter` configured on the main-thread database.

Concrete failure mode: you register an adapter / transformer on `PowerSyncDatabase` expecting it to decrypt or normalize sync data, and on Chromium it silently has no effect — the SharedWorker writes raw bytes to SQLite. The only way you notice is that your DAL reads get raw encrypted / malformed data.

Root causes (all architectural):

1. `SharedSyncImplementation` hardcodes `new SqliteBucketStorage(...)` with no injection hook.
2. Transformer functions cannot be serialized across the Comlink worker boundary.
3. The `adapter` field is explicitly omitted from the `SharedSyncInitOptions` type passed to the worker.

## Environments where you can't even use the workaround

- **Safari / iOS**: `OPFSCoopSyncVFS` (required for WKWebView stack limits) does not support SharedWorker.
- **Tauri**: the `tauri://` protocol blocks SharedWorker and `import.meta.url`-based worker loading.
- **iOS WKWebView**: SharedWorker exceeds memory limits and causes black-screen crashes.

For these environments, keep `enableMultiTabs: false` and run transformers on the main thread via `generateBucketStorageAdapter()`.

## Workaround (Chromium/Firefox)

Ship a custom SharedWorker that subclasses `SharedSyncImplementation` and overrides `generateStreamingImplementation()`. Middleware must be embedded at bundle time — there is no runtime hand-off path. See the linked `powersync-custom-sharedworker-override` skill.

## Upgrade hazard

`SharedSyncImplementation` is marked `@internal`, imported via a Vite alias to `node_modules/@powersync/web/lib/src/...`. Upgrading `@powersync/web` may silently change the copied method body without any TypeScript error, because the import is path-aliased through string resolution. Diff the upstream `generateStreamingImplementation()` on every bump.

## Evidence

- `docs/powersync-sync-middleware.md:136-207` — explicit statement of the constraint and workaround
- `vite.config.ts:73-82` — internal alias used to reach the non-public class
