---
name: idempotency-data-simulation
description: Simulate idempotency key stores, duplicate detection, and side-effect counting entirely client-side without a real backend.
category: workflow
triggers:
  - idempotency data simulation
tags:
  - auto-loop
version: 1.0.0
---

# idempotency-data-simulation

The simulation pattern uses an **in-memory key-value store** (`const store = {}`) acting as the server's idempotency key registry. When a simulated request arrives, the key is checked against the store: if absent, a new entry is written with status and timestamp (`store[key] = {status:'201', time:...}`) and the side effect executes; if present, the request returns early with a cached response and no side effect fires. Key generation uses `'ik-' + Math.random().toString(36).slice(2,10)` for unique keys, while duplicate simulation explicitly reuses `lastKey`. This produces a faithful model of real idempotency middleware (e.g., Stripe's Idempotency-Key header) without needing any server infrastructure.

Side-effect counting is tracked via separate counters for requests vs. effects (`nonCount` vs `nonEffects`, `idemCount` vs `idemEffects`). The non-idempotent path increments both counters on every call. The idempotent path increments the request counter always but caps the effect counter at 1 using a simple guard (`if(idemEffects === 0)`). An auto-simulation mode fires mixed new/duplicate requests on a 900ms interval using a probability split (`Math.random() > 0.4 ? newRequest : duplicateRequest`), generating realistic retry traffic patterns. This makes the simulation suitable for demos, load-testing UIs, and teaching scenarios where learners need to see the deduplication behavior emerge over dozens of requests.

For mathematical idempotency simulation, the pattern applies a function iteratively N times using a reduce-style loop (`for(let i=0; i<n; i++) v = fn(v)`) and collects the full sequence into an array. The idempotency test is then a simple equality check: `fn(x) === fn(fn(x))`. This two-level simulation — network-level key deduplication for API idempotency and function-level fixed-point detection for mathematical idempotency — covers both practical and theoretical dimensions, and both run entirely in the browser with zero dependencies.
