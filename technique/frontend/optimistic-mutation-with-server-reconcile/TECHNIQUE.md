---
version: 0.1.0-draft
name: optimistic-mutation-with-server-reconcile
description: "Optimistic UI mutation with server reconcile: client updates immediately, server canonical, divergence triggers rollback"
category: frontend
tags:
  - optimistic-ui
  - mutation
  - reconciliation
  - rollback
  - perceived-latency

composes:
  - kind: skill
    ref: architecture/optimistic-mutation-pattern
    version: "*"
    role: optimistic-shape-baseline
  - kind: skill
    ref: workflow/idempotency-data-simulation
    version: "*"
    role: server-side-idempotency
  - kind: knowledge
    ref: pitfall/idempotency-implementation-pitfall
    version: "*"
    role: counter-evidence

binding: loose

verify:
  - "every composes[].ref is installed in the hub"
  - "client predicts server response; reconciles on actual response; rolls back on divergence"
---

# Optimistic Mutation with Server Reconcile

> The client updates UI immediately upon user action, predicting the server response. When the actual server response arrives, the client reconciles: accept (response matches prediction) or rollback (divergence). Distinct from polling, from real-time sync, and from blocking-spinner UX.

## When to use

- Latency between client and server is user-perceptible (≥ 200ms)
- The user action is high-frequency (likes, edits, drag-drop) and the server can usually validate them
- Server failures are rare enough that occasional rollback is tolerable as UX

## When NOT to use

- Server has high failure rate — rollback flicker becomes the norm
- Action has irreversible side-effects on third parties (sending email, charging card) — pessimistic UI required
- Real-time multi-user collaboration (use OT/CRDT instead)

## Shape

```
client: [user clicks like]
   │
   ├─► UI updates (optimistic) ─────────────────────┐
   │                                                │
   ├─► POST /like (with idempotency key)            │
   │      │                                         │
   │      ▼                                         ▼
   │   server processes              user sees instant feedback
   │      │
   │      ▼
   │   response
   │      │
   ├─◄────┘
   │
   ├─► response matches prediction? ── YES ──► commit (no UI change)
   │                                  ── NO  ──► rollback UI + show error
```

## Glue summary (net value added)

| Added element | Where |
|---|---|
| Idempotency key on every mutation — client retries don't double-apply | Per request |
| Rollback path is first-class UI; not "show error and refresh page" | UI design |
| Predicted state and actual state both retained until reconcile resolves | Client state machine |
| Server is canonical at all times — predictions never persist locally past reconcile | Storage policy |

## Known limitations

- Predictions can be wrong even when server is healthy (validation rules client doesn't know) → rollback flicker
- Client storage of pending mutations grows during offline → needs eviction policy
- Doesn't compose well with strong-consistency requirements; eventual is implicit

## Provenance

- Authored 2026-04-25, pilot in 10-technique batch
- Shares feedback-loop concept with #6 (backpressure) but on UI<->server axis
