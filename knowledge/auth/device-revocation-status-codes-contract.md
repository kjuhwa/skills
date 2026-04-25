---
version: 0.1.0-draft
name: device-revocation-status-codes-contract
description: Client-server contract used by PowerSync token/upload endpoints to signal account and device state. Codes are load-be...
type: knowledge
category: api
confidence: high
source: thunderbolt/docs/powersync-account-devices.md
source_type: extracted-from-git
source_url: https://github.com/thunderbird/thunderbolt.git
source_ref: main
source_commit: 9d9c18ba511decfd3b45fc0f72c265d83355fe95
source_project: thunderbolt
imported_at: 2026-04-18T00:00:00Z
linked_skills: [device-revocation-reset-flow]
tags: [api, http-status, powersync, devices, auth]
---

# Device / account status code contract for PowerSync clients

Client-server contract used by PowerSync token/upload endpoints to signal account and device state. Codes are load-bearing — the client branches on them to decide "reset everything" vs "just retry later".

| Code | Body | Meaning | Client action |
|------|------|---------|---------------|
| **410 Gone** | `{ code: 'ACCOUNT_DELETED' }` | The user no longer exists | Full reset, navigate to `/account-deleted` |
| **403 Forbidden** | `{ code: 'DEVICE_DISCONNECTED' }` | This `X-Device-ID` is revoked | Full reset, navigate to `/` |
| **409 Conflict** | `{ code: 'DEVICE_ID_TAKEN' }` | `X-Device-ID` is claimed by a different user | Reset and mint a new device id |
| **400** | `{ code: 'DEVICE_ID_REQUIRED' }` | Missing `X-Device-ID` header | Fix client code; developer error |
| **401** | (generic) | Invalid/expired token | Attempt refresh; do **not** reset |
| **204** | (empty) | Idempotent success on revoke | Nothing; the action already happened |

## Required request headers for PowerSync token + upload

- `Authorization: Bearer <session-token>`
- `X-Device-ID: <localStorage device id>` (required on upload; required on token for revoke-awareness)
- `X-Device-Name: <label>` (optional, only on token; updates the `devices.name` column)

## Why the codes matter

- **401 vs 410/403**: 401 is recoverable (token refresh). 410/403 are terminal for this device and must trigger a full local wipe because the backend can't send selective deletes fast enough to prevent crashes.
- **409 vs new device**: a fresh uuidv7 from the client is cheap, and the reset flow already clears localStorage, so the safest recovery is to reset and let the app re-register from zero.
- **Idempotent 204 on revoke**: prevents retry storms from the device-management UI.

## CORS note

`X-Device-ID`, `X-Device-Name`, and other custom headers must be added to the backend's `corsAllowHeaders` list; otherwise browser preflight fails silently. See the linked cors-allow-headers knowledge.

## Evidence

- `docs/powersync-account-devices.md:98-205`
- `docs/delete-account-and-revoke-device.md:37-65`
- `backend/src/config/settings.ts:52-63`
