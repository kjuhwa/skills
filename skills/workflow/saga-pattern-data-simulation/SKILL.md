---
name: saga-pattern-data-simulation
description: Async step-walker with LIFO compensation stack, configurable fault injection, and timed execution delays for realistic saga simulation.
category: workflow
triggers:
  - saga pattern data simulation
tags:
  - auto-loop
version: 1.0.0
---

# saga-pattern-data-simulation

The core simulation engine shared across all three apps follows a single pattern: an async for-loop walks the saga step array forward, pushing each completed step index onto a `completed[]` stack. At each step, a `setTimeout`-wrapped Promise (600-700ms) simulates network/service latency. If a failure condition is met at step `i`, the loop breaks and a reverse for-loop iterates `completed` from tail to head (LIFO order), executing each step's `.comp` compensation action with its own delay (400-500ms). This LIFO unwinding is the critical correctness property — it mirrors how real distributed sagas must undo operations in reverse dependency order (you cannot cancel an order before refunding the payment that depended on it).

Fault injection is implemented in two distinct modes across the apps. The orchestrator (app 100) uses a random approach: `failAt = Math.floor(Math.random() * 3) + 1` picks a random step index (1-3, never step 0) to fail, simulating unpredictable service failures. The simulator (app 102) uses a deterministic toggle approach: a `Set` of failure-injected step indices controlled by UI switches, letting the user compose arbitrary multi-fault scenarios. The reusable pattern is to support both modes — random for demo/chaos testing, toggle-set for reproducible debugging. Both guard against re-entry with a `busy`/`running` boolean flag that prevents concurrent saga executions, which mirrors the real constraint that a saga instance must be single-threaded.

The data model itself is minimal but complete: each step is a `{name, comp}` pair binding a forward action to its compensating action. The timeline app (101) extends this to `{s (service index), t (start time), d (duration), ok (success boolean), comp (is-compensation boolean)}` for temporal projection. This two-tier model — simple pairs for execution, extended records for visualization — is the reusable data shape. The forward action name is always a verb-noun command ("Process Payment"), and the compensation is always the semantic inverse ("Refund Payment"), not a generic "undo." This naming discipline matters because in real systems, compensation is not rollback — it is a new forward action that semantically reverses the effect.
