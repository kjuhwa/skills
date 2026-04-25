# Custom SharedWorker for PowerSync middleware

PowerSync defaults to `enableMultiTabs: true` on Chromium and Firefox, which spawns a SharedWorker that deduplicates the sync connection across tabs. That worker hardcodes `new SqliteBucketStorage(...)` and never reads the `adapter` you configured on the main thread — Comlink cannot serialize transformer functions across the worker boundary, and the `adapter` field is explicitly omitted from `SharedSyncInitOptions`.

The fix is to embed the transformer **inside** a custom SharedWorker bundle at build time.

## Alias the internal path

```ts
// vite.config.ts
resolve: {
  alias: {
    'powersync-web-internal': path.resolve(__dirname, 'node_modules/@powersync/web/lib/src'),
  },
}
```

```json
// tsconfig.json
"paths": {
  "powersync-web-internal/*": ["./node_modules/@powersync/web/lib/src/*"]
}
```

`SharedSyncImplementation` is marked `@internal`, so this is the only way to import it.

## Subclass and override

```ts
import { SharedSyncImplementation } from 'powersync-web-internal/worker/sync/SharedSyncImplementation.js'

export class ThunderboltSharedSyncImplementation extends SharedSyncImplementation {
  protected generateStreamingImplementation() {
    // Copy parent body but swap SqliteBucketStorage -> TransformableBucketStorage
    const storage = new TransformableBucketStorage(this.dbAdapter)
    storage.addTransformer(encryptionMiddleware)
    // ... rest of parent's implementation
    return { ...existingImpl, storage }
  }
}
```

## Worker entry

Mirror PowerSync's `SharedSyncImplementation.worker.ts` and instantiate the subclass.

## Register it in the PowerSync config

```ts
sync: {
  worker: () =>
    new SharedWorker(
      new URL('./worker/ThunderboltSharedSyncImplementation.worker.ts', import.meta.url),
      { type: 'module', name: `shared-sync-${dbFilename}` },
    ),
}
```

Vite recognizes `new SharedWorker(new URL(...))` and emits a separate ES module chunk.

## Side-channel data inside the worker

The content key lives in IndexedDB. The codec reads it lazily inside the worker; a `BroadcastChannel` propagates cache invalidation (e.g. on sign-out) across main thread, SharedWorker, and other tabs.

## Evidence

- `docs/powersync-sync-middleware.md:136-207`
- `src/db/powersync/database.ts` — worker wiring
- `vite.config.ts:73-82` — alias
