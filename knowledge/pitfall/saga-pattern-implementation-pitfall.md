---
name: saga-pattern-implementation-pitfall
description: Common failure modes in saga orchestration: compensation ordering bugs, missing re-entry guards, and the rollback-vs-compensation confusion.
category: pitfall
tags:
  - saga
  - auto-loop
---

# saga-pattern-implementation-pitfall

The most dangerous bug in saga implementations is compensation order reversal. All three apps correctly implement LIFO compensation (reverse-iterating the `completed[]` stack), but a common mistake is to compensate in FIFO order or to compensate all steps (including the failed one). In app 100, the failed step is explicitly excluded — `completed` only contains successfully finished steps, and the reverse loop starts from `completed.length - 1`. If you accidentally push the failed step onto `completed` before checking the failure condition, you will try to compensate an action that never completed, which in a real distributed system means sending a refund for a payment that was never charged — creating a negative balance or a duplicate credit. The correct pattern is: check failure *before* pushing to the completed stack.

A second pitfall visible in these implementations is the re-entry guard (`running`/`busy` flag). All three apps set this flag at the start and clear it at every exit point (success and failure). However, none of them handle the case where compensation itself fails. In a real system, if "Refund Payment" throws during compensation, the saga is left in a partially-compensated state with the `busy` flag still true (deadlocked) or prematurely cleared (allowing a second concurrent execution against inconsistent state). Production saga orchestrators must implement a compensation retry loop with exponential backoff, or persist the saga state to a durable store so that a supervisor process can resume compensation after a crash. The apps' simplistic `await + setTimeout` model hides this because `setTimeout` never rejects.

A third subtle issue is the confusion between "rollback" and "compensation." The log messages in app 100 say "Saga rolled back," but sagas do not roll back — they compensate forward. A database rollback restores the exact prior state atomically; a saga compensation issues new transactions that approximate the prior state. "Cancel Order" does not un-create the order — it creates a cancellation record. This semantic difference matters because compensation can have observable side effects (the customer receives a cancellation email), may not be idempotent (refunding twice doubles the refund), and can itself fail. Treating compensation as rollback leads developers to skip idempotency keys on compensation actions and to omit compensation-failure handling, both of which cause data inconsistency in production.
