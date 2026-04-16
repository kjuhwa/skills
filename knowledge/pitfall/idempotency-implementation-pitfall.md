---
name: idempotency-implementation-pitfall
description: Common failure modes when implementing idempotency keys including TTL races, non-atomic check-and-set, and payload-mismatch hazards.
category: pitfall
tags:
  - idempotency
  - auto-loop
---

# idempotency-implementation-pitfall

The most dangerous pitfall is a **non-atomic check-and-set** on the idempotency key store. If the "does this key exist?" check and the "insert this key" write are two separate operations (e.g., a `GET` then `PUT` to Redis without `SETNX`/`NX` flag), two concurrent requests with the same key can both pass the check before either writes, causing the side-effect to execute twice. This is especially insidious because it only manifests under load and passes all single-threaded tests. The fix is to use atomic compare-and-swap primitives (`SETNX` in Redis, `INSERT ... ON CONFLICT DO NOTHING` in Postgres, `putIfAbsent` in ConcurrentHashMap) and treat the successful write as the single source of truth for ownership.

The second major pitfall is **TTL boundary races**. If an idempotency key expires at T=60s and a retry arrives at T=59.999s, the key may expire between the lookup and the response construction, causing the system to execute the side-effect a second time. Worse, if the client retries with the same key after TTL expiration, the system correctly treats it as a new request — but the side-effect has already occurred. Mitigation requires a two-phase approach: the idempotency key TTL must be significantly longer than the maximum expected retry window, and completed operations should be recorded in a permanent (or long-lived) ledger separate from the short-lived dedup cache, so that even post-TTL retries can detect prior execution.

A subtler pitfall is **payload mismatch**: a client sends a request with idempotency key K and payload A, then retries with key K but payload B (due to a bug or interleaved user actions). Naively returning the cached response for payload A is incorrect and can cause silent data corruption. Production implementations must either hash the payload into the key, store the original payload alongside the key and reject mismatches with HTTP 422, or treat payload changes as a new logical operation. Ignoring this case is safe in demos but catastrophic in payment or inventory systems where the same key with different amounts would silently deduplicate to the wrong value.
