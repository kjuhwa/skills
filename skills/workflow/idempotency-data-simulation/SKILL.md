---

name: idempotency-data-simulation
description: Generating realistic duplicate-request streams, key-collision scenarios, and retry storms to stress-test idempotency implementations.
category: workflow
triggers:
  - idempotency data simulation
tags: [workflow, idempotency, data, simulation, test]
version: 1.0.0
---

# idempotency-data-simulation

Simulation data for idempotency apps needs three synthetic streams layered together. First, the **baseline unique-request stream**: generate N requests with distinct UUIDv4 idempotency keys, realistic payloads (amounts, user IDs, order items), and timestamps spaced by a Poisson arrival process. Second, the **duplicate stream**: for each baseline request, emit 1-5 replays with the same idempotency key at exponentially-decaying delays (100ms, 1s, 10s, 1m, 1h) — this mimics real retry behavior from clients, proxies, and mobile network hiccups. Third, the **adversarial stream**: inject same-key-different-payload collisions (should 409), expired-key replays (should 410 or re-execute depending on TTL policy), and near-duplicate keys differing by one char (should NOT dedupe).

For the key-vault app specifically, seed the store with keys at varied lifecycle stages: freshly-created (TTL ~24h remaining), mid-life (TTL ~1h), near-expiry (TTL <60s), and tombstoned. Include keys with cached responses of varied sizes (empty 204, small JSON, large payloads hitting size caps) and varied HTTP statuses (2xx cached, 4xx cached-as-terminal, 5xx NOT cached since retry should re-execute).

For quiz/playground data, pre-compute scenario pairs: `{operation, call_count, expected_final_state}`. Include subtle cases — `counter += 0` is idempotent, `counter = counter` is idempotent but `counter++` is not; `DELETE /user/42` is idempotent in effect (404 on second call is still "user 42 is gone") even though the status code differs. Seed the DB with a mix of "already applied" rows so replays demonstrate the cache-hit path without requiring a cold start.
