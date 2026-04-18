---
version: 0.1.0-draft
name: idempotency-implementation-pitfall
description: Common failure modes when implementing idempotency keys — race conditions, improper scope, and caching the wrong response.
category: pitfall
tags:
  - idempotency
  - auto-loop
---

# idempotency-implementation-pitfall

The most dangerous pitfall is the **check-then-act race**: two concurrent requests with the same idempotency key both read "key not found", both execute the operation, both try to insert the key. Without a unique constraint + atomic INSERT-or-SELECT (or `SELECT FOR UPDATE` inside a transaction, or Redis `SET NX`), you get double-execution — exactly the outcome idempotency was meant to prevent. The vault must treat key-insertion as the serialization point, not a post-hoc bookkeeping step. Related: caching the response BEFORE the operation commits means a crash mid-operation can leave a cached "success" for work that never completed.

Scope pitfalls are subtle. An idempotency key scoped globally lets user A's key collide with user B's; scoped per-user but not per-endpoint lets `POST /charge` and `POST /refund` collide. The correct scope is usually `(tenant, user, endpoint, key)`. Equally, forgetting to fingerprint the **request payload** means a client that retries with a mutated body under the same key gets the cached response for the old body — silently dropping their new intent. The fix: store a payload hash alongside the key and return 422/409 on mismatch rather than serving a stale cached response.

Finally, **not everything should be cached**. 5xx responses must NOT be cached as idempotent results — the retry is the whole point. Streaming responses, responses with `Set-Cookie`, and responses that embed timestamps or one-time tokens also break under replay. And TTL must exceed the client's maximum retry window (often 24h for mobile clients with offline queues); a 5-minute TTL on a key that a client retries at hour 6 causes re-execution of an operation the user believed was already done. Idempotency is a contract between client retry policy and server retention policy — mismatched TTLs silently void the guarantee.
