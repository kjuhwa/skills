---
name: idempotency-implementation-pitfall
description: Common failure modes when implementing idempotency keys — key scoping, missing TTL, race conditions on concurrent duplicates, and the false safety of HTTP verb assumptions.
category: pitfall
tags:
  - idempotency
  - auto-loop
---

# idempotency-implementation-pitfall

The most dangerous pitfall is **key-scope mismatch**. The replay-lab binds keys to a simple incrementing counter (`key-0`, `key-1`), meaning each logical operation gets exactly one key. In production, developers often scope keys too broadly (one key per user session, causing unrelated requests to collide) or too narrowly (one key per retry attempt, defeating deduplication entirely). The key must be scoped to the *logical operation* — the same payment intent must always carry the same key, but two different payments from the same user must not share one. If keys are client-generated UUIDs with no server-side association to the operation, a client bug that regenerates the key on retry silently bypasses the entire guard.

The second pitfall is **missing TTL and unbounded store growth**. The heatmap and replay-lab store idempotency records forever (or until manual reset). In production, an idempotency store without expiration becomes a memory/storage leak. But setting TTL too short introduces a window where a legitimate late retry arrives after the key expires, causing a duplicate charge. The safe pattern is: TTL must exceed the maximum expected retry window (typically 24-48 hours for payment APIs), and the response stored with the key must include enough data to reconstruct a full reply, not just a boolean "seen" flag — otherwise the client gets a 200 with no body on retry.

The third pitfall is **race conditions between concurrent duplicate requests**. The state-machine app uses a synchronous `processed.has(eventKey)` check, which is safe in single-threaded JavaScript but maps to a critical section in any multi-threaded or distributed backend. Two identical requests arriving within milliseconds can both pass the "key not found" check before either writes the key, causing double-execution. The fix requires atomic check-and-set — `INSERT ... ON CONFLICT DO NOTHING` in PostgreSQL, `SET NX` in Redis, or a conditional put with version checks in DynamoDB. Additionally, assuming HTTP verb semantics guarantee safety (as the heatmap does with GET/PUT/DELETE) is only valid if the server implementation actually honors those contracts — a `PUT /pay` that appends to a ledger instead of replacing state is non-idempotent regardless of the verb.
