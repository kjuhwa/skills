---
name: cached-heap-snapshot-worker
description: Load a Chrome heap snapshot (`.heapsnapshot`) once into a DevTools worker proxy, cache by absolute path, and answer aggregates/stats/staticData queries against the cached proxy to avoid re-parsing multi-gigabyte files on every query.
category: heap-snapshot
version: 1.0.0
version_origin: extracted
tags: [heap-snapshot, devtools, worker, streaming, caching]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/HeapSnapshotManager.ts
imported_at: 2026-04-18T00:00:00Z
---

# Cached Heap Snapshot Loader

## When to use

- You're exposing "aggregate memory breakdown" / "total size per class" via a tool and the raw V8 heap snapshot is 100s of MB.
- Agents will ask multiple follow-up questions about the same snapshot (top classes, filter by class name, retained sizes).
- Re-parsing per query would blow latency and memory.

## How it works

- Maintain a `Map<absolutePath, {snapshot: HeapSnapshotProxy, worker: HeapSnapshotWorkerProxy}>` on the manager instance.
- `getSnapshot(path)`: resolve to absolute path, return cached proxy if present. Otherwise call `#loadSnapshot(abs)`.
- `#loadSnapshot`: construct a DevTools `HeapSnapshotWorkerProxy`, call `workerProxy.createLoader(1, snapshotProxy => resolveSnapshot(snapshotProxy))` with `Promise.withResolvers` to wire the async snapshot-ready callback to a promise.
- Stream the file: `fsSync.createReadStream(absolutePath, {encoding: 'utf-8', highWaterMark: 1024*1024})`, `for await (const chunk of fileStream) await loaderProxy.write(chunk); await loaderProxy.close();`. Awaiting each write applies backpressure.
- Each cached entry lives until an explicit `dispose(path)` call, which terminates the worker (`worker.dispose()`) and drops the Map entry.
- Expose narrow query methods: `getAggregates(path)` (pass a blank `NodeFilter`), `getStats(path)`, `getStaticData(path)` — each resolves the snapshot and asks it for the derived data.

## Example

```ts
export class HeapSnapshotManager {
  #snapshots = new Map<string, {snapshot, worker}>();
  async getSnapshot(filePath) {
    const abs = path.resolve(filePath);
    const cached = this.#snapshots.get(abs);
    if (cached) return cached.snapshot;
    const {snapshot, worker} = await this.#loadSnapshot(abs);
    this.#snapshots.set(abs, {snapshot, worker});
    return snapshot;
  }
  async #loadSnapshot(abs) {
    const workerProxy = new DevTools.HeapSnapshotModel.HeapSnapshotProxy.HeapSnapshotWorkerProxy(
      () => {}, import.meta.resolve('./third_party/devtools-heap-snapshot-worker.js'));
    const {promise, resolve} = Promise.withResolvers();
    const loaderProxy = workerProxy.createLoader(1, resolve);
    const stream = fsSync.createReadStream(abs, {encoding: 'utf-8', highWaterMark: 1024*1024});
    for await (const chunk of stream) await loaderProxy.write(chunk);
    await loaderProxy.close();
    return {snapshot: await promise, worker: workerProxy};
  }
  dispose(filePath) {
    const abs = path.resolve(filePath);
    const c = this.#snapshots.get(abs);
    if (c) { c.worker.dispose(); this.#snapshots.delete(abs); }
  }
}
```

## Gotchas

- The DevTools worker is heavy; a cached entry holds the parsed graph in memory for the lifetime of its process. Expose `dispose` and document it.
- Resolve paths to absolute before using as map keys — relative paths from different CWDs would double-cache the same file.
- `createReadStream` with `encoding: 'utf-8'` is required; the worker's loader expects strings, not Buffers. The 1MB `highWaterMark` keeps per-chunk overhead low.
- `await loaderProxy.write(chunk)` inside `for await` is the backpressure point. Never buffer the whole file to a string first — defeats the streaming purpose.
- If the file is truncated or malformed, the worker may never call the loader callback. Add an outer timeout/abort or the consumer hangs.
