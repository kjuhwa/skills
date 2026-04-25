---
version: 0.1.0-draft
name: wal-based-sync-provider
summary: Offline-first mobile sync using a Write-Ahead Log with per-frame status (pending / synced / miss / corrupted), storage-origin filtering (SD card / flash / phone), and a server-side job state machine for chunked merge.
category: mobile-offline-sync
confidence: medium
tags: [offline-first, wal, flutter, sync-provider, fastapi, multi-storage]
source_type: extracted-from-git
source_url: https://github.com/BasedHardware/omi.git
source_ref: main
source_commit: 1c310f7fc4c37acf7e1bedb014e3a4adfd56546e
source_project: omi
imported_at: 2026-04-18T00:00:00Z
---

# WAL-Based Mobile Sync Provider

Pattern for offline-first audio sync from a BLE wearable to a cloud backend. Frames captured from the device are tracked in a Write-Ahead Log; statuses and storage origin drive the UI filters and retry policy.

## Domain model (mobile side)

```
Wal {
  id
  payload | payloadRef
  syncKey                 // stable per-frame hash, see ble-device-header-stripping
  status:  pending | synced | miss | corrupted
  storage: disk | mem | sdcard | flashPage
  originalStorage         // where the frame first landed (may differ after a transfer)
  isSyncing: bool
}
```

Two filter axes:

- **Status filter** (UI): `pending` (miss / corrupted / isSyncing) vs. `synced`.
- **Storage filter**: `sdcard` / `flashPage` / `phone (disk | mem)` — each filter shows WALs where `storage == X` *or* `originalStorage == X`, so post-transfer frames still surface under their origin.

## Provider responsibilities

`SyncProvider extends ChangeNotifier implements IWalServiceListener, IWalSyncProgressListener`:

- Holds `_allWals`, `_isLoadingWals`, `_storageFilter`, `_statusFilter`.
- Exposes computed lists: `pendingWals`, `syncedWals`, `filteredByStatusWals`, `filteredWals`.
- Listens to `IWalServiceListener` for WAL discovery/update events.
- Listens to `IWalSyncProgressListener` for per-WAL sync progress → drives the progress UI.

## Backend state machine

```
POST /sync/jobs            → create_sync_job      (status: created)
agent picks up             → mark_job_processing  (status: processing)
chunks uploaded            → download_audio_chunks_and_merge
final transcript generated → status: complete
                           → mark_job_failed (with retry count) on error
```

Endpoints are careful to:

- Accept a list of `(wal_id, chunk_uri)` — enables parallel upload without transaction contention.
- Extract speaker embeddings inline (`extract_embedding_from_bytes`) so speaker identification doesn't require a second round trip.
- Idempotency key = `wal_id` — re-uploading the same WAL yields `status: already_synced`.

## Why WAL + status beats "last-synced timestamp"

- Timestamp-only sync loses frames if the device clock drifts or the user swaps batteries (clock resets).
- Per-frame status lets the user see exactly *which* frames are missing and *why* (miss / corrupted → actionable error UX).
- `originalStorage` preserves provenance across transfers (SD card → phone disk → cloud), keeping the filter UX honest about where data started.

## Implementation notes

- Never mutate WALs in-place from the UI layer — always route through the service so `IWalServiceListener` fires for all listeners.
- Keep `setStatusFilter()` + `setStorageFilter()` → `notifyListeners()` to refresh derived getters without reseating the list.
- Batch uploads in chunks of ~1 MB; BLE wearables produce small frames so aggregate before POST.
- Log `chunks_total / chunks_speech / chunks_silence` per job for retention tuning (see VAD gate metrics).

## Evidence in source

- `app/lib/providers/sync_provider.dart` — provider, filters, WAL lists
- `app/lib/pages/conversations/sync_page.dart` — UI wiring
- `backend/routers/sync.py` — job state machine, chunk merge, embedding extraction

## Reusability

Transfers to any offline-first mobile product where a device captures data without connectivity — health wearables, field-survey apps, collaborative note-taking, photo sync from cameras. The WAL + status + storage-origin triplet is the minimum spanning model for honest offline UX.
