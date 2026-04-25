---
version: 0.1.0-draft
name: finite-state-machine-monotonic-ratchet
description: "Monotonic state machine: states advance in one direction only, never reverse — distinct from saga's bidirectional chain"
category: arch
tags:
  - state-machine
  - monotonic
  - ratchet
  - one-way-transition
  - audit-trail

composes:
  - kind: skill
    ref: workflow/finite-state-machine-data-simulation
    version: "*"
    role: state-machine-baseline
  - kind: skill
    ref: input/relative-mouse-mode-state-machine
    version: "*"
    role: concrete-state-machine-example
  - kind: knowledge
    ref: pitfall/finite-state-machine-implementation-pitfall
    version: "*"
    role: state-transition-counter-evidence

binding: loose

verify:
  - "every composes[].ref is installed in the hub"
  - "every transition is asserted to be one-way (no inverse edge defined)"
---

# Finite-State Machine: Monotonic Ratchet

> A state machine where every transition moves forward; no transition leads back to a previously-occupied state. Distinct from saga (which can reverse via compensation) and from generic FSMs (which often allow cycles). The "ratchet" property guarantees an audit-able forward-only timeline.

## When to use

- Lifecycle modeling where rollback is unsafe (issued credential → revoked → never reissued; published article → archived → never republished as the same identity)
- Compliance-sensitive flows where every state change must be an append-only event
- Distributed coordination where reverse transitions would require negotiated consensus among observers

## When NOT to use

- Workflows with legitimate retry / undo (use saga pattern instead — `technique/arch/saga-with-compensation-chain`)
- States that can flap based on transient conditions (use circuit breaker instead)
- Systems where reverse paths exist but are rare — express the rare reverse as a NEW state (e.g. `revoked-then-reissued` ≠ `active`)

## Glue summary (net value added)

| Added element | Why |
|---|---|
| Forbid inverse edges at construction time | Compile-time guarantee no transition graph contains a back-edge |
| Each transition emits an immutable event with timestamp + actor | Audit trail for the forward-only history |
| State-snapshot vs event-log dual storage — state for query, log for proof | Reconstructable timeline even if state is corrupted |
| Treat erroneous "I need to go back" as a NEW forward state | Disciplines designers into modeling reality, not wishful undo |

## Known limitations

- Real-world systems sometimes need reverse transitions for error correction; this technique forces them to be modeled as new forward states (more states, more design discipline)
- Append-only event log can grow unbounded; needs separate retention policy
- Not a fit for short-lived transactions (saga is cheaper)

## Provenance

- Authored 2026-04-25, pilot in a 10-technique batch
- Schema: `docs/rfc/technique-schema-draft.md`
- Sibling: pilots #1–#7 (linear / tree / loop / ladder / saga / backpressure / quorum)
