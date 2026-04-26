---
version: 0.2.0-draft
name: orchestrator-saga-compensation-routing
description: "Orchestrator owns saga lifecycle — runs forward steps, on failure invokes compensation chain in reverse, escalates uncompensable to DLQ."
category: ai
tags:
  - orchestrator
  - saga
  - compensation
  - dead-letter-queue
  - distributed-transaction

composes:
  - kind: knowledge
    ref: pitfall/idempotency-implementation-pitfall
    version: "*"
    role: idempotency-rule
  - kind: knowledge
    ref: pitfall/dead-letter-queue-implementation-pitfall
    version: "*"
    role: dlq-discipline
  - kind: knowledge
    ref: architecture/opensre-investigation-pipeline-architecture
    version: "*"
    role: pipeline-state-shape

recipe:
  one_line: "Orchestrator runs forward saga steps each with registered compensation. On step failure: reverse-chain compensations LIFO. Compensation that fails routes to DLQ for human resolution; saga audit trail per state transition."
  preconditions:
    - "Each forward step has a defined compensation (reversibly idempotent)"
    - "Saga ID propagates to every step + compensation (idempotency key)"
    - "DLQ exists for uncompensable cases"
  anti_conditions:
    - "Steps without compensations (e.g. emails sent, irreversible API) — saga unsuitable"
    - "Single-step transaction — saga overhead unjustified"
    - "Hot loop where compensation wall-clock unacceptable — synchronous tx preferred"
  failure_modes:
    - signal: "Compensation itself fails; saga stuck mid-rollback"
      atom_ref: "knowledge:pitfall/dead-letter-queue-implementation-pitfall"
      remediation: "Failed compensation → DLQ with full saga audit; alert on DLQ depth; manual unblock workflow"
    - signal: "Compensation re-fires on retry; double-undo"
      atom_ref: "knowledge:pitfall/idempotency-implementation-pitfall"
      remediation: "Compensation must be idempotent under at-least-once; saga-id+step-id as idempotency key"
    - signal: "Saga ID lost mid-flight; orchestrator can't trace state"
      atom_ref: "knowledge:architecture/opensre-investigation-pipeline-architecture"
      remediation: "Saga ID propagated as first-class context; every log + side effect carries it"
  assembly_order:
    - phase: register-compensations-upfront
      uses: pipeline-state-shape
    - phase: forward-step-loop
      uses: idempotency-rule
      branches:
        - condition: "all steps succeed"
          next: commit
        - condition: "step fails"
          next: compensation-chain
    - phase: compensation-chain
      uses: idempotency-rule
      branches:
        - condition: "all compensations succeed"
          next: rollback-complete
        - condition: "compensation fails"
          next: dlq-escalate
    - phase: dlq-escalate
      uses: dlq-discipline

binding: loose

verify:
  - "every composes[].ref resolves on disk"
  - "the technique requires upfront compensation registration, not per-step inference"
---

# Orchestrator Saga Compensation Routing

> Orchestrator owns saga lifecycle. Forward steps register compensations upfront. Step failure → reverse-chain compensations LIFO. Compensation failure → DLQ + audit + manual unblock. Distinct from in-process saga because orchestrator is the lifecycle owner.

## When to use
- Each forward step has compensation
- Saga ID propagates throughout
- DLQ for uncompensable cases

## When NOT to use
- Irreversible side effects
- Single-step transaction
- Hot loop with strict latency

## Glue summary
| Added element | Where |
|---|---|
| Upfront compensation registration | Setup |
| Saga-id idempotency key on every compensation call | Compensation chain |
| DLQ + audit + manual unblock for compensation failures | Recovery |

## Provenance
- Authored 2026-04-26 in batch with 9 sibling orchestrator techniques
