---
name: idempotency-data-simulation
description: Client-side request replay engine with a key-indexed server store that demonstrates duplicate detection, cached-response return, and cumulative side-effect tracking without a real backend.
category: workflow
triggers:
  - idempotency data simulation
tags:
  - auto-loop
version: 1.0.0
---

# idempotency-data-simulation

The simulation models a complete idempotency lifecycle in-memory. A `serverStore` object acts as the idempotency key registry — each key maps to `{amount, timestamp}`. When a request arrives with a key that already exists in the store, the server path short-circuits: it returns the cached response and logs a duplicate detection event without mutating any balance or counter. When the key is absent (or no key is provided), the request is treated as new — the amount is deducted, the store is populated, and a success entry is logged. A "Replay All" function iterates stored keys and re-submits each one 3 times with staggered `setTimeout` delays, proving that all replays hit the duplicate path.

A toggle checkbox (`Include Idempotency Key`) lets the user disable key attachment, instantly converting the same request flow into a dangerous non-idempotent one where every replay deducts the balance again. This A/B toggle is the most important teaching mechanism — the same requests, the same replay, but the running `totalDeducted` counter diverges dramatically. The state machine app extends this further by tracking transitions with a `processed` Set keyed on `currentState:eventName`, ensuring that firing the same event twice from the same state is an idempotent no-op that triggers a visual pulse rather than a re-transition.

The reusable pattern is a three-layer simulation: (1) a key-value store for deduplication (`Map<idempotencyKey, cachedResponse>`), (2) a branching processor that checks the store before executing side-effects, and (3) a replay/retry driver that re-submits identical payloads to prove the guard works. Add a toggle to disable the guard for contrast. This structure works for payments, state machines, event processors, or any domain where "exactly-once semantics" needs demonstration.
