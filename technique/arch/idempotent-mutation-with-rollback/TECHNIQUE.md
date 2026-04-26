---
version: 0.1.0
name: idempotent-mutation-with-rollback
description: Compose an idempotent mutation pipeline with a rollback path — apply once, retry safely, undo cleanly. Domain-agnostic (DB, frontend, distributed).
category: arch
tags: [idempotency, rollback, mutation, retry-safe, composition]

composes:
  - kind: knowledge
    ref: pitfall/idempotency-implementation-pitfall
    role: failure-mode-warning
    note: >-
      The canonical failure mode the technique exists to prevent — non-idempotent
      retries that double-apply (duplicate inserts, double-charged accounts,
      replayed side effects). Codifies the deduplication invariants the
      pipeline must hold.
    version: "*"
  - kind: skill
    ref: architecture/optimistic-mutation-pattern
    role: forward-step
    note: >-
      The forward mutation. Applies the change with optimistic UI / write-ahead
      semantics; assumes success and reconciles on response. Generic shape;
      this technique adapts it to any domain that needs idempotent forward
      progress.
    version: "*"
  - kind: skill
    ref: backend/migration-processor-pipeline
    role: pipeline-orchestrator
    note: >-
      Multi-stage processor that owns idempotent-key tracking + checkpointing.
      Provides the durable state where a retry can resume without re-applying
      completed steps.
    version: "*"
  - kind: skill
    ref: workflow/idempotency-data-simulation
    role: verification-harness
    note: >-
      Simulator that drives the pipeline through repeated executions and
      asserts idempotency invariants (output count, side-effect count, state
      hash equivalence). Catches double-apply bugs before they ship.
    version: "*"

recipe:
  one_line: "Mutation pipeline with idempotency keys + checkpoint resume + rollback path. At-least-once-safe, exactly-once-effect. Domain-agnostic."
  preconditions:
    - "Mutation must be retry-safe under at-least-once delivery (network failure mid-call, message-bus redelivery, manual re-trigger)"
    - "Mutation has observable side effects (DB write, balance change, external API) that must be performed exactly once"
    - "Pipeline can persist idempotency keys + checkpoint state durably across crashes"
  anti_conditions:
    - "Mutation is naturally idempotent (PUT-style overwrite) — no pipeline overhead needed"
    - "No durable state available for checkpoints — pipeline cannot resume after crash"
    - "Side effects are unrecoverable in principle (sending email, charging card without refund) — rollback path doesn't exist"
  failure_modes:
    - signal: "Retry causes double-apply because idempotency key check happens after side effect, not before"
      atom_ref: "knowledge:pitfall/idempotency-implementation-pitfall"
      remediation: "Idempotency key check must precede side effect; verification harness drives repeated execution and asserts state-hash equivalence"
  assembly_order:
    - phase: register-key
      uses: pipeline-orchestrator
    - phase: forward-mutate
      uses: forward-step
      branches:
        - condition: "key seen before"
          next: skip-already-applied
        - condition: "first time this key"
          next: apply
    - phase: apply
      uses: forward-step
    - phase: checkpoint
      uses: pipeline-orchestrator
    - phase: skip-already-applied
      uses: pipeline-orchestrator
    - phase: verify-invariants
      uses: verification-harness

binding: loose

verify:
  - "every composes[].ref resolves on disk"
  - "the simulation harness asserts idempotency under at-least-once delivery"
---

# Idempotent Mutation with Rollback

> A mutation pipeline that applies a change once, can be retried safely under at-least-once delivery, and can be rolled back when the upstream consumer reports a failure post-commit. Domain-agnostic — the same shape applies to DB migrations, frontend optimistic UI, and distributed-transaction sagas.

<!-- references-section:begin -->
## Composes

**knowledge — `pitfall/idempotency-implementation-pitfall`**
The canonical failure mode the technique exists to prevent — non-idempotent retries that double-apply (duplicate inserts, double-charged accounts, replayed side effects). Codifies the deduplication invariants the pipeline must hold.

**skill — `architecture/optimistic-mutation-pattern`**  _(version: `*`)_
The forward mutation. Applies the change with optimistic UI / write-ahead semantics; assumes success and reconciles on response. Generic shape; this technique adapts it to any domain that needs idempotent forward progress.

**skill — `backend/migration-processor-pipeline`**  _(version: `*`)_
Multi-stage processor that owns idempotent-key tracking + checkpointing. Provides the durable state where a retry can resume without re-applying completed steps.

**skill — `workflow/idempotency-data-simulation`**  _(version: `*`)_
Simulator that drives the pipeline through repeated executions and asserts idempotency invariants (output count, side-effect count, state hash equivalence). Catches double-apply bugs before they ship.

<!-- references-section:end -->

## When to use

- A mutation must be retry-safe under at-least-once delivery (network failure mid-call, message-bus redelivery, manual re-triggering).
- The mutation has observable side effects (DB write, account balance change, external API call) that must be performed exactly once even if the input arrives multiple times.
- The mutation may need rollback after commit — the upstream consumer can fail later, downstream confirmation might be denied, or business invariants discover a conflict post-fact.
- The team can tolerate the storage overhead of an idempotent-key table or checkpoint store.

## When NOT to use

- **Truly stateless transforms** — pure function with no side effects. Idempotency is automatic; the technique adds overhead for nothing.
- **Single-attempt operations with no retry semantics** — e.g., a one-off CLI command with no upstream queue. The deduplication infrastructure is unjustified.
- **Operations whose semantics ARE non-idempotent by design** — append-only logs (each retry IS a new entry by intent), event-sourced timelines. Apply a different technique (event-sourcing-with-replay) instead.
- **Asynchronous fire-and-forget** — when the caller doesn't await confirmation, the rollback path has nothing to revert against. The fan-out-fan-in-with-bulkhead technique covers async cases.

## Phase sequence

```
caller → idempotent-key check → [seen? return cached result] → forward mutation → checkpoint → return
                                          ↑                          ↓ failure
                                          │                       rollback step
                                          │                          ↓
                                          └────── retry safely ──────┘
```

- **Phase 0 (key check)** — derive an idempotent key from the input (request ID, hash of payload, or a caller-supplied token). Look up in the checkpoint store. If the key is present and the prior run succeeded, return the cached result immediately — no re-mutation.
- **Phase 1 (forward step)** — apply the optimistic-mutation-pattern. Write the desired state, optimistic UI flips, side effects begin. Mark "in-progress" in the checkpoint store with the idempotent key.
- **Phase 2 (checkpoint)** — on success, mark the idempotent key as "completed" with the result hash. Subsequent retries hit Phase 0's cache and short-circuit.
- **Phase 3 (rollback)** — on failure (post-commit, e.g., upstream consumer rejects the result), invoke the compensation step that reverses the forward mutation. Mark the idempotent key as "rolled-back". A subsequent retry with the same key goes through Phase 1 again — the rollback erased the prior commit.

## Glue summary

| Atom | Role | What this technique adds beyond the atom |
| --- | --- | --- |
| `pitfall/idempotency-implementation-pitfall` | failure-mode codification | Mandates Phase 0 key-check as the structural defense, not an optional optimization |
| `architecture/optimistic-mutation-pattern` | forward-step shape | Generalizes from frontend optimistic UI to any domain (DB, distributed); the technique's contribution is the cross-domain abstraction |
| `backend/migration-processor-pipeline` | pipeline state | Wraps the forward step with durable checkpoint state so retries resume rather than re-apply |
| `workflow/idempotency-data-simulation` | verification | Mandates that the simulator runs as part of the technique's verify step — idempotency invariants are not assumed, they are tested |

## Why "with rollback" matters

Idempotent mutation alone (Phase 0–2) handles **at-least-once delivery during the forward path**. But mutations that must be reversed after commit need a fourth phase. Without rollback, a successful Phase 2 + later failure leaves the system in a desired state that nobody actually wants. The pipeline must know how to undo, not just how to apply once.

This is what distinguishes the technique from any of its component atoms used alone:
- The optimistic-mutation skill applies forward; it doesn't compose with rollback semantics.
- The migration-processor skill checkpoints state; it doesn't have a domain-agnostic rollback hook.
- The idempotency pitfall codifies the failure mode but doesn't prescribe the rollback path.

## Domain mappings

| Domain | Phase 1 (forward) | Phase 3 (rollback) | Idempotent key |
|---|---|---|---|
| DB migration | apply schema/data change | revert to prior schema + restore from snapshot | migration version |
| Frontend optimistic UI | display optimistic state | reconcile from server (replace with authoritative) | request ID |
| Distributed transaction (saga) | local commit | compensation transaction | saga ID |
| Message-bus consumer | write side effect, ack | retract side effect, nack | message ID |

The technique's value is in the **shape** that holds across all these domains — not in any one domain-specific instance.

## Verification (draft)

- `verify.sh` (when added) re-asserts each `composes[].ref` exists.
- Sample integration: a 3-domain test suite (DB / frontend / saga) where the same `idempotent-key` + `forward-step` + `rollback-step` interfaces are wired to domain-specific implementations. Idempotency simulator asserts that 5 retries of the same key produce 1 forward effect and 0 duplicate effects.

## Known limitations

- **Idempotent-key cardinality** — the key table grows unbounded unless paired with TTL or compaction. The technique doesn't prescribe the GC strategy.
- **Rollback isn't always possible** — some side effects (sent emails, external API calls with no compensation endpoint) cannot be reversed. The technique applies only to reversible side effects.
- **Distributed key coordination** — multi-replica deployments need consensus on the key store (e.g., Redis with RedLock, or a primary-replica DB). Single-replica scope is simpler; the technique doesn't span the consensus boundary.
- **At-most-once is a different problem** — when retries are forbidden entirely (e.g., financial settlement), use a different technique (transactional-once-only-delivery) that prevents retry rather than tolerating it.

## Provenance

- Authored 2026-04-25 in response to `_suggest_techniques.py` Bundle 1 signal — the same 4 atoms recur across `technique/db/idempotent-migration-with-resume-checkpoint` (3/4), `technique/frontend/optimistic-mutation-with-server-reconcile` (3/4), `technique/arch/saga-with-compensation-chain` (2/4), and 2 paper proposed_builds in `paper/db/migration-checkpoint-overhead` and `paper/frontend/optimistic-ui-flicker-tolerance`.
- Second technique authored as a direct response to the suggestion-scanner output (after `arch/gated-fallback-chain` in #1120). The pattern is now established: when the scanner's frequent-pair count for a bundle reaches ≥3 across distinct domains, the bundle is a candidate for promotion to a domain-agnostic technique.
- The technique generalizes a pattern that previously lived as 3 domain-specific compositions. Each domain technique remains valid in its own right; this technique sits one layer of abstraction up and gets cited by all three.
