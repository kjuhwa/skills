---
name: idempotency-data-simulation
description: Synthetic data generation strategies for simulating idempotency key lookups, repeated function applications, and duplicate state-machine event dispatch.
category: workflow
triggers:
  - idempotency data simulation
tags:
  - auto-loop
version: 1.0.0
---

# idempotency-data-simulation

For **key-vault simulation**, generate idempotency keys as `idk_` + a truncated UUID (8 chars is sufficient for demo uniqueness). Maintain an in-memory object map (`store[key] → {txn, amount}`) acting as the server-side dedup store. On each request, check the map: if the key exists, increment a `deduped` counter and return the cached `txn` ID; if not, generate a new `txn_` + random base-36 suffix, store it, and increment `processed`. Add artificial latency (300–700ms via `setTimeout` with jitter) to simulate network round-trips and make the dedup decision visible in the UI timeline. Seed the simulation with an initial send at ~200ms followed by two retries at ~900ms and ~1400ms so the user sees one real processing + two dedup hits on first load.

For **function-lab simulation**, define a catalog of functions with an explicit `idempotent: boolean` flag and a `start` value. Track a rolling history array (capped at ~30 entries) of numeric outputs — for string/array functions, map to `.length` for chartability. On each "apply" click, push `f(current)` into the history and check stability: if the last 3 values are identical, mark the card as `stable`. Auto-apply 3 times on page load (staggered by 150ms per card) so every card starts with visible chart data. Non-numeric start values (strings, arrays) need a `isStr`/`isArr` flag to branch the numeric projection logic.

For **state-machine simulation**, model states as an ordered array and transitions as a map from `currentState → validEvent`. The dispatch function is a three-way branch: (1) if `current === targetState`, it's a duplicate — increment `duplicateCount`, log "no-op"; (2) if `current === requiredSourceState`, transition and increment `transitionCount`; (3) otherwise, log "ignored — wrong state". This three-way classification (transition / duplicate-no-op / invalid) is the critical data model. Seed with a SUBMIT, a duplicate SUBMIT, then an APPROVE to demonstrate all three paths immediately.
