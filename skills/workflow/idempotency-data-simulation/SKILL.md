---
name: idempotency-data-simulation
description: Strategies for generating realistic idempotency key traffic including retry storms, clock skew, partial failures, and TTL boundary races for testing dedup logic.
category: workflow
triggers:
  - idempotency data simulation
tags:
  - auto-loop
version: 1.0.0
---

# idempotency-data-simulation

Generate request streams where each logical operation has a stable idempotency key (UUID v4 or deterministic hash of payload), and a configurable percentage of requests are retries carrying the same key. Model three retry profiles: **immediate retry** (within 50ms, simulating client-side timeout retry), **delayed retry** (1-30s, simulating user double-click or queue redelivery), and **late retry** (arriving after TTL expiration, which must be treated as a new request). Each profile produces different deduplication outcomes and exercises different code paths in the key store.

Simulate partial failure scenarios where the side-effect executes but the response is lost before reaching the client, forcing a retry that must return the cached result without re-executing. Model this by tagging requests with a `sideEffectCompleted: true, responseDelivered: false` state tuple. Additionally, generate clock-skew scenarios where the key-store node and the application node disagree on wall-clock time by up to N seconds, causing premature or delayed TTL expiration. Inject concurrent duplicate arrivals (two requests with the same key hitting the dedup gate within the same millisecond) to test atomicity of the check-and-set operation.

For load testing, produce burst patterns: a normal baseline of 100 req/s with unique keys, punctuated by retry storms of 10x duplicate traffic every 30 seconds. Track three metrics per simulation tick — **dedup hit rate** (percentage of requests correctly identified as duplicates), **false-new rate** (duplicates that escaped dedup due to TTL or race), and **stale-cache rate** (responses served from expired cache entries). These metrics drive the visualization layer and expose tuning tradeoffs between TTL length, storage cost, and correctness.
