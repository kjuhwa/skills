---
name: idempotency-implementation-pitfall
description: Common bugs when implementing idempotency keys — race windows, fingerprint mismatches, and TTL traps
category: pitfall
tags:
  - idempotency
  - auto-loop
---

# idempotency-implementation-pitfall

The most common bug is the **check-then-store race**: a naive implementation reads the key vault, sees no entry, then executes the operation, then stores the result. Two concurrent requests with the same key both see an empty vault and both execute. The fix is an atomic "insert-if-absent" that also stores an `IN_FLIGHT` sentinel, with later duplicates blocking on that sentinel until the first completes. Demos that skip this and just use `get` + `set` will pass casual testing but fail under true concurrency — and users will copy the broken pattern.

The second trap is **payload fingerprinting**. An idempotency key alone is not enough: if the client reuses a key with a different body (buggy client, or stale retry after a payload-mutating interceptor), the server must reject with 422, not silently return the old response. This requires storing a hash of the canonicalized request body alongside the key. Canonicalization is subtle — JSON key order, number formatting, and whitespace all matter. Many implementations forget this and end up with keys that match but payloads that don't, returning wrong answers.

Third, **TTL semantics are tricky**. If the TTL is too short, legitimate client retries (e.g., after a 30s mobile network stall) miss the cache and cause double-execution. If too long, the vault grows unbounded and stale keys may collide with new unrelated operations. The pragmatic range is 24h–7d for most APIs, with the TTL starting from *completion* time, not *first-seen* time — otherwise a slow operation can expire its own idempotency guarantee mid-flight.
