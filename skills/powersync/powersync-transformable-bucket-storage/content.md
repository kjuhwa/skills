# Transformable bucket storage for PowerSync

PowerSync's sync client writes downloaded data to SQLite by calling `adapter.control(PROCESS_TEXT_LINE, jsonPayload)` directly on the configured `BucketStorageAdapter`. That means any transformation you want to apply to sync data (decryption, decompression, normalization) must happen inside `control()`, not in your DAL — by the time DAL reads fire the data is already persisted.

The Thunderbolt implementation subclasses `SqliteBucketStorage` and treats the override as a small middleware pipeline:

```typescript
export type DataTransformMiddleware = {
  transform(batch: SyncDataBatch): Promise<SyncDataBatch> | SyncDataBatch
}

export class TransformableBucketStorage extends SqliteBucketStorage {
  private transformers: DataTransformMiddleware[] = []

  addTransformer(t: DataTransformMiddleware) { this.transformers.push(t) }

  async control(cmd: PowerSyncControlCommand, payload: string) {
    if (cmd !== PowerSyncControlCommand.PROCESS_TEXT_LINE) {
      return super.control(cmd, payload)
    }
    const batch = SyncDataBatchClass.fromJSON(JSON.parse(payload))
    let transformed = batch
    for (const t of this.transformers) transformed = await t.transform(transformed)
    return super.control(cmd, JSON.stringify(transformed))
  }
}
```

To make PowerSync actually use it, subclass `PowerSyncDatabase` and return a populated `TransformableBucketStorage` from `generateBucketStorageAdapter()`. That covers the Safari / Tauri main-thread path.

For Chrome / Edge / Firefox, `enableMultiTabs: true` spawns a SharedWorker that builds its own `SqliteBucketStorage` internally — main-thread transformers are silently ignored. See the linked knowledge for how to subclass `SharedSyncImplementation` and inject the transformer inside the worker bundle.

## Evidence

- `src/db/powersync/TransformableBucketStorage.ts:1-60` — the override pattern
- `docs/powersync-sync-middleware.md:93-135` — middleware interface and integration points
- `src/db/powersync/middleware/EncryptionMiddleware.ts` — a real consumer (AES-GCM decrypt)
