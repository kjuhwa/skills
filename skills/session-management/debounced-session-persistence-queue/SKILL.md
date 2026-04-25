---
name: debounced-session-persistence-queue
description: Coalesce rapid session updates into a single debounced async write, serialized per-session to prevent concurrent rewrites of the same .tmp file.
category: session-management
version: 1.0.0
version_origin: extracted
tags: [persistence, debounce, race-conditions, session-state]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/shared/src/sessions/persistence-queue.ts
imported_at: 2026-04-18T00:00:00Z
---

# Debounced per-session persistence queue

## When to use
- Agent state updates arrive in bursts (typing indicator flips, token usage updates, label edits).
- Synchronous writes block the main thread; naive async writes race.
- Must guarantee that two "flush now" calls for the same session don't overlap on the filesystem.

## How it works
1. Keep a `Map<sessionId, PendingWrite>` where `PendingWrite = { data, timer }`.
2. On `persist(sessionId, data)`:
   - Clear any existing timer for that session.
   - Store the latest `data` in the map entry.
   - Start a new `setTimeout` (e.g. 500ms) that calls the internal write.
3. Internal write must be **serialized per session**: wrap it in a per-session promise chain:
   ```ts
   private inflight: Map<string, Promise<void>> = new Map();
   private async enqueueWrite(id, data) {
     const prev = this.inflight.get(id) ?? Promise.resolve();
     const next = prev.then(() => this.actuallyWrite(id, data));
     this.inflight.set(id, next);
     try { await next; } finally {
       if (this.inflight.get(id) === next) this.inflight.delete(id);
     }
   }
   ```
4. Atomic write pattern: write `session.jsonl.tmp` -> `rename` over `session.jsonl`.
5. **Merge header metadata** with what's on disk before writing - another process (another window, a sync daemon) may have updated labels while we had an in-memory edit queued. Use `mergeHeaderWithExternalMetadata(localHeader, diskHeader)` to preserve user-facing metadata that we didn't change.
6. On shutdown, `flushAll()` drains every pending timer synchronously before process exit.

## Example
```ts
class SessionPersistenceQueue {
  private pending = new Map<string, PendingWrite>();
  persist(id: string, data: StoredSession, debounceMs = 500) {
    const existing = this.pending.get(id);
    if (existing) clearTimeout(existing.timer);
    const timer = setTimeout(() => {
      const payload = this.pending.get(id)!.data;
      this.pending.delete(id);
      this.enqueueWrite(id, payload);
    }, debounceMs);
    this.pending.set(id, { data, timer });
  }
  async flushAll() {
    for (const [id, { data, timer }] of this.pending) {
      clearTimeout(timer); this.pending.delete(id);
      await this.enqueueWrite(id, data);
    }
  }
}
```

## Gotchas
- Without the per-session promise chain, two rapid flushes can both write to `session.jsonl.tmp`, rename, then the second overwrites the first mid-stream.
- Merge external metadata only for fields the USER edits (name, labels, permissionMode). Don't merge messages - the local append is canonical.
- Don't forget `flushAll` on SIGINT/SIGTERM; otherwise 500ms of state loss per shutdown.
- The signature-based diff (`getHeaderMetadataSignature`) lets you skip writes when nothing actually changed - big win during rapid UI refreshes.
