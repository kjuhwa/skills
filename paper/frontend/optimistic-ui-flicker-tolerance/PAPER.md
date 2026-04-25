---
version: 0.2.0-draft
name: optimistic-ui-flicker-tolerance
description: "Optimistic UI vs server failure rate: at what rate does rollback flicker outweigh perceived-latency benefit?"
category: frontend
tags: [optimistic-ui, ux, rollback-flicker, error-rate, hypothesis]
type: hypothesis

premise:
  if: Optimistic UI is deployed when the server failure rate (or prediction-mismatch rate) varies
  then: UX quality is non-linear in error rate. At <1% server failure, optimistic UI clearly wins on perceived-latency. At >5% the rollback flicker outweighs the gain. Net positive only when error rate is stable below 3%.

examines:
  - kind: skill
    ref: architecture/optimistic-mutation-pattern
    role: optimistic-shape
  - kind: skill
    ref: workflow/idempotency-data-simulation
    role: idempotency-discipline
  - kind: knowledge
    ref: pitfall/idempotency-implementation-pitfall
    role: counter-evidence
  - kind: knowledge
    ref: pitfall/circuit-breaker-implementation-pitfall
    role: failure-mode-similarity

perspectives:
  - name: Latency Gain is Constant
    summary: Optimistic UI saves the round-trip on every successful action. The gain is roughly server-RTT per action and does not change with error rate.
  - name: Rollback Cost is Compounding
    summary: Rollback flicker is jarring once; multiple rollbacks per session compound user frustration non-linearly. Studies suggest >3 rollbacks/session is the threshold where users actively dislike the feature.
  - name: Server-Side Stability Required
    summary: Optimistic UI's value depends on stable error rate. A spiky error pattern produces user-visible inconsistency (some actions stick, others rollback). Stability of failure rate matters as much as the rate itself.
  - name: Mitigations
    summary: Subtle rollback animations (instead of jarring flicker), deferred rollback (wait 200ms then rollback if needed), and predictive batching can shift the threshold upward but do not fundamentally change the curve.

external_refs: []

proposed_builds:
  - slug: optimistic-ui-rollback-frequency-monitor
    summary: Monitoring component that tracks rollback frequency per session and flags sessions where rollback rate exceeds the threshold derived from this paper. Surfaces UX regression invisible in standard error-rate monitoring.
    scope: poc
    requires:
      - kind: skill
        ref: architecture/optimistic-mutation-pattern
        role: subject-component
      - kind: knowledge
        ref: pitfall/idempotency-implementation-pitfall
        role: realistic-failure-shape

experiments:
  - name: rollback-tolerance-user-study
    hypothesis: Across N=200 user sessions at varying simulated error rates {0.5%, 1%, 3%, 5%, 10%}, satisfaction (post-task survey) plateaus past 3% and drops sharply past 5%.
    method: Recruit users; build a test app with controlled error injection; measure task completion time + post-task satisfaction.
    status: planned
    built_as: null
    result: null
    supports_premise: null
    observed_at: null

outcomes: []

status: draft
retraction_reason: null
---

# Optimistic UI: Flicker Tolerance Curve

## Introduction

(see frontmatter)

### Background

`technique/frontend/optimistic-mutation-with-server-reconcile` documents the shape but leaves the question of *when* to use it open. This paper claims optimistic UI is conditionally good — bounded by server reliability.

## Methods

(planned — see `experiments[0].method` in frontmatter for the full design. This section becomes substantive when `status: implemented` and is checked for length by `_audit_paper_imrad.py` at that point.)

## Results

(pending — experiment status: planned. Run `/hub-paper-experiment-run <slug>` once the experiment completes to populate this section from `experiments[0].result`.)

## Discussion

(see frontmatter)

### Limitations

- User-study methodology — small samples have wide confidence intervals
- Subjective satisfaction is hard to compare across user populations
- Mitigation techniques (mentioned in perspectives) shift the curve; the paper's claim is for the unmitigated case

<!-- references-section:begin -->
## References (examines)

**skill — `architecture/optimistic-mutation-pattern`**
optimistic-shape

**skill — `workflow/idempotency-data-simulation`**
idempotency-discipline

**knowledge — `pitfall/idempotency-implementation-pitfall`**
counter-evidence

**knowledge — `pitfall/circuit-breaker-implementation-pitfall`**
failure-mode-similarity


## Build dependencies (proposed_builds)

### `optimistic-ui-rollback-frequency-monitor`  _(scope: poc)_

**skill — `architecture/optimistic-mutation-pattern`**
subject-component

**knowledge — `pitfall/idempotency-implementation-pitfall`**
realistic-failure-shape

<!-- references-section:end -->

## Provenance

- Authored 2026-04-25, batch of 10
- Body migrated to IMRaD structure 2026-04-25 per `docs/rfc/paper-schema-draft.md` §5 by `_migrate_paper_to_imrad.py`. Pre-IMRaD body is preserved in git history; no semantic claims were rewritten during the migration. For hypothesis-type drafts, Methods + Results sections are stubs until the experiment completes.
