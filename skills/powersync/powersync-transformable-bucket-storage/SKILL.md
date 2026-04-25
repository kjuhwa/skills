---
name: powersync-transformable-bucket-storage
description: Intercept PowerSync sync data before it hits SQLite by subclassing SqliteBucketStorage and running a middleware pipeline on PROCESS_TEXT_LINE payloads, so you can decrypt, decompress, or normalize rows before they are written.
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
tags: [powersync, sqlite, middleware, sync, e2e-encryption]
linked_knowledge: [powersync-sharedworker-multi-tab-constraint]
---

## When to use

You have a PowerSync client and need to transform sync data (decrypt, normalize, decompress) before it lands in SQLite. PowerSync's Rust client bypasses `saveSyncData` and calls `adapter.control(PROCESS_TEXT_LINE, payload)` directly, so you can't simply wrap the DAL.

## Steps

1. Subclass `SqliteBucketStorage` with a `TransformableBucketStorage` that overrides `control()`.
2. Keep a `transformers: DataTransformMiddleware[]` array and expose `addTransformer/removeTransformer/clearTransformers`.
3. In `control(cmd, payload)`: if `cmd === PowerSyncControlCommand.PROCESS_TEXT_LINE`, `JSON.parse` the payload into a `SyncDataBatch`, run it through each transformer in order, re-serialize, then call `super.control(cmd, serialized)`. For every other command, call `super.control` unchanged.
4. Define the middleware contract: `type DataTransformMiddleware = { transform(batch: SyncDataBatch): Promise<SyncDataBatch> | SyncDataBatch }`.
5. Subclass `PowerSyncDatabase` into a `ThunderboltPowerSyncDatabase` that overrides `generateBucketStorageAdapter()` to return a `TransformableBucketStorage` with the desired transformers registered.
6. Register your middleware on both the main-thread storage (`getPowerSyncOptions().transformers`) and inside any custom SharedWorker's `generateStreamingImplementation()` — PowerSync instantiates a separate storage inside the SharedWorker that ignores main-thread config.

## Counter / Caveats

- Transformers cannot be serialized across the Comlink worker boundary. The SharedWorker path must embed transformers at bundle time, not pass them at runtime — see the linked knowledge about the multi-tab constraint.
- Transformers run on every sync frame, so keep them allocation-light; parse once and mutate `OplogEntry.data` in place where possible.
- `PROCESS_BSON_LINE`, `START`, `STOP` and other control commands must pass through unchanged. Filtering only on `PROCESS_TEXT_LINE` is the safe default.

## Evidence

- `src/db/powersync/TransformableBucketStorage.ts:1-60` — class shape, transformer list, control override
- `docs/powersync-sync-middleware.md:93-135` — design rationale and middleware interface
- `src/db/powersync/ThunderboltPowerSyncDatabase.ts` — registration point
