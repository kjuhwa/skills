---
version: 0.1.0-draft
name: saga-with-compensation-chain
description: "Saga technique: forward chain + reverse-order compensation chain, idempotent at every step, audit-anchored before fire"
category: arch
tags:
  - saga
  - compensation
  - distributed-transaction
  - idempotency
  - rollback
  - forward-reverse-chain

composes:
  - kind: skill
    ref: workflow/saga-pattern-data-simulation
    version: "*"
    role: forward-chain-baseline
  - kind: skill
    ref: workflow/idempotency-data-simulation
    version: "*"
    role: per-step-idempotency-shape
  - kind: skill
    ref: workflow/rollback-anchor-tag-before-destructive-op
    version: "*"
    role: pre-flight-audit-anchor
  - kind: knowledge
    ref: pitfall/saga-pattern-implementation-pitfall
    version: "*"
    role: forward-chain-counter-evidence
  - kind: knowledge
    ref: pitfall/idempotency-implementation-pitfall
    version: "*"
    role: compensation-safety-counter-evidence
    note: compensation-safety-counter-evidence

recipe:
  one_line: "Forward chain executes steps with compensating actions registered per step. On failure, reverse-chain compensations LIFO-undo. Idempotent every step; audit-anchored before fire."
  preconditions:
    - "Multi-step distributed transaction where each step has a known compensating action"
    - "Steps cross service boundaries — local DB transactions cannot span them"
    - "Eventual consistency is acceptable; atomic isolation is not required"
  anti_conditions:
    - "Steps share a database — use a regular DB transaction"
    - "No compensating action exists for a step (irreversible side effect) — saga can't undo"
    - "Strong isolation required — saga has eventual consistency, not isolation"
  failure_modes:
    - signal: "Compensation runs but the original action's side effect persists in a downstream system"
      atom_ref: "knowledge:pitfall/saga-pattern-implementation-pitfall"
      remediation: "Verify each compensating action independently, do not assume it undoes cleanly. Test compensation against real downstream state."
    - signal: "Re-running a compensation produces different result — compensation is not idempotent"
      atom_ref: "knowledge:pitfall/idempotency-implementation-pitfall"
      remediation: "All compensations must be idempotent; verify via repeated invocation in CI before adding to saga"
  assembly_order:
    - phase: anchor
      uses: pre-flight-audit-anchor
    - phase: forward-chain
      uses: forward-chain-baseline
      branches:
        - condition: "all steps succeed"
          next: commit
        - condition: "any step fails"
          next: compensate
    - phase: commit
      uses: forward-chain-baseline
    - phase: compensate
      uses: per-step-idempotency-shape

binding: loose

verify:
  - "every composes[].ref is installed in the hub"
  - "every composes[].version range intersects the installed version"
  - "compensation order is asserted to be the strict reverse of forward order"
  - "every compensating action is registered as idempotent at saga init"
  - cmd: "./verify.sh"
---

# Saga with Compensation Chain

> Pilot #1 was a linear pipeline, #2 a decision tree, #3 an event-driven loop, #4 a hierarchical ladder. This pilot is a **forward chain + reverse compensation chain** — the unique property is that the technique runs in two opposite directions on the same step list, and the relationship between them (LIFO inverse) is itself the load-bearing invariant.

<!-- references-section:begin -->
## Composes

**skill — `workflow/saga-pattern-data-simulation`**  _(version: `*`)_
forward-chain-baseline

**skill — `workflow/idempotency-data-simulation`**  _(version: `*`)_
per-step-idempotency-shape

**skill — `workflow/rollback-anchor-tag-before-destructive-op`**  _(version: `*`)_
pre-flight-audit-anchor

**knowledge — `pitfall/saga-pattern-implementation-pitfall`**  _(version: `*`)_
forward-chain-counter-evidence

**knowledge — `pitfall/idempotency-implementation-pitfall`**  _(version: `*`)_
compensation-safety-counter-evidence

<!-- references-section:end -->

## When to use

- A multi-step distributed transaction where each step has a known **compensating action** (debit ↔ refund, allocate ↔ release, send-email ↔ recall-or-mark-undelivered)
- Steps cross service boundaries — local DB transactions cannot span them
- Eventual consistency is acceptable, atomic isolation is not required
- The team is willing to author compensations as first-class code (not "we'll figure it out if it fails")

## When NOT to use

- All steps live in one DB — use a database transaction
- A step has no meaningful compensation (e.g. "physically ship a package" — the only "compensation" is a separate return flow which is its own saga)
- Latency budget cannot tolerate retry-and-compensate paths — saga inherently has long tails
- Compensations would themselves require their own sagas — the recursion is a sign the boundaries are wrong

## Chain shape

```
                  forward chain (firing order)
                  ──────────────────────────────►

  init ──► [audit anchor] ──► step 1 ──► step 2 ──► step 3 ──► step 4 ──► commit
                                  │          │          │           │
                            (failure here triggers compensation)
                                  │          │          │           │
                                  ▼          ▼          ▼           ▼
              ◄────────────────────────────────────────────────────────
                  reverse compensation chain (LIFO of completed-only)

  Critical invariant:
    if step K succeeded but step K+1 failed,
    compensations run for steps K, K-1, ..., 1 — in that order.
    Step K+1's compensation does NOT run because step K+1 never committed.
```

The two chains share the **same step list** but traverse it in opposite directions. The technique's value is in keeping that pairing aligned and visible.

## Glue summary (net value added by this technique)

The composed skills each describe a piece. What this technique uniquely adds:

| Added element | Where |
|---|---|
| Strict LIFO compensation order — `compensate(K)` runs before `compensate(K-1)` for any K, no exceptions | Compensation phase |
| Compensation-only-for-completed rule — never run `compensate(K+1)` if `step(K+1)` failed mid-execution | Phase boundary |
| Idempotency key threaded through both chains — same key on the forward step and its compensation, so partial retries don't double-apply | Saga init, every step |
| Audit anchor BEFORE first forward step — captures the pre-saga state in a tag/log so a manual recovery has a known point of reference (reuses `workflow/rollback-anchor-tag-before-destructive-op`) | Phase 0 |
| Compensation availability assertion at saga init — refuse to start a saga whose step N has no registered compensation | Init |
| Compensation-failure escalation rule — N retries with backoff, then **stop and require human intervention**; do NOT continue compensating earlier steps if the current compensation is failing | Compensation phase |

The atomic skills tell you **how to author one saga step or one compensation**. This technique tells you **how the two chains relate** — which is where most production saga bugs live.

## Why "compensation availability assertion at init" matters

A saga that fires step 1 successfully and then discovers step 4's compensation was never written has no recovery. The system is in a partially-completed state with no clean rollback path.

This technique makes the assertion at init time non-optional. The check is cheap (lookup in a registry) and prevents the unrecoverable case.

## Why each compensation must be idempotent

Compensation itself can fail and be retried. If `compensate(K)` is not idempotent, retry double-applies it (e.g. issues two refunds for one debit). The pitfall `knowledge/pitfall/idempotency-implementation-pitfall` is the canonical reminder of why this must be enforced at the type/API level, not just a comment.

The same idempotency key used by the forward step must be visible to the compensation. The technique threads it through both directions explicitly.

## Failure cases the chain shape handles

| Failure | What runs |
|---|---|
| Step 3 fails before commit | `compensate(2)` then `compensate(1)`; step 3's compensation is NOT invoked |
| `compensate(2)` fails | Retry up to N times; if still failing, halt, escalate; do NOT proceed to `compensate(1)` |
| Compensation chain succeeds but a later audit reveals partial state | The audit-anchor tag from Phase 0 is the recovery reference; manual cleanup uses it as the known-good baseline |
| Saga init fails compensation-availability check | Saga refuses to start; no forward steps fire |

## Verification (draft)

```bash
#!/usr/bin/env bash
set -e
SKILLS_HUB="${SKILLS_HUB:-$HOME/.claude/skills-hub/remote}"
for ref in \
  "skills/workflow/saga-pattern-data-simulation/SKILL.md" \
  "skills/workflow/idempotency-data-simulation/SKILL.md" \
  "skills/workflow/rollback-anchor-tag-before-destructive-op/SKILL.md" \
  "knowledge/pitfall/saga-pattern-implementation-pitfall.md" \
  "knowledge/pitfall/idempotency-implementation-pitfall.md"; do
  test -f "$SKILLS_HUB/$ref" || { echo "MISSING: $ref"; exit 1; }
done
echo "OK"
```

## Known limitations (v0.1 draft)

- **No nested-saga support** — if a saga step is itself a saga, the compensation semantics blur (does the inner saga's compensation count toward the outer's retry budget?). This technique scopes to flat sagas only. Nested sagas need a separate technique.
- **Compensation-while-compensating is forbidden** — if `compensate(K)` is itself a multi-step process that fails halfway, this technique stops and escalates. A nested-compensation pattern is a different design.
- **No timeout policy** — wall-clock budgets per step and per compensation are left to the operator. The technique describes ordering and idempotency; it does not prescribe timing.
- **Compensation registry format is unspecified** — the technique requires that compensations be discoverable at saga init but does not specify the storage format (in-code map, config file, service registry). Per-domain choice.
- **Idempotency key strategy is left to the operator** — UUID per saga? Hash of inputs? Per-step counter? All work; the technique only requires the SAME key visible to both chains for a given step.

## Provenance

- Authored: 2026-04-25
- Status: pilot #5 for the `technique/` schema v0.1 — **forward chain + reverse compensation chain** shape (complementary to pilot #1 linear pipeline, #2 decision tree, #3 event-driven loop, #4 hierarchical ladder)
- Schema doc: `docs/rfc/technique-schema-draft.md`
- Sibling pilots:
  - `technique/workflow/safe-bulk-pr-publishing` (linear)
  - `technique/debug/root-cause-to-tdd-plan` (decision tree)
  - `technique/testing/fuzz-crash-to-fix-loop` (event-driven loop)
  - `technique/ai/agent-fallback-ladder` (hierarchical ladder)
