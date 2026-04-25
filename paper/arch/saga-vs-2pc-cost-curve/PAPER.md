---
version: 0.2.0-draft
name: saga-vs-2pc-cost-curve
description: "Saga vs 2PC: at what service count N does saga become cheaper than 2PC? Hypothesis: crossover between N=2 and N=3"
category: arch
tags: [saga, 2pc, cost-model, distributed-transaction, hypothesis]
type: hypothesis

premise:
  if: A multi-step distributed transaction can be implemented as either saga (forward+compensation) or 2PC (synchronous prepare/commit)
  then: Saga is cheaper when N ≥ 3 services AND failure rate is non-trivial; 2PC is cheaper when N = 2. Crossover between N=2 and N=3 in typical workloads.

examines:
  - kind: technique
    ref: workflow/safe-bulk-pr-publishing
    role: shape-comparison-baseline-for-multi-step
    note: shape-comparison-baseline-for-multi-step
  - kind: skill
    ref: workflow/saga-pattern-data-simulation
    role: saga-shape
  - kind: knowledge
    ref: pitfall/saga-pattern-implementation-pitfall
    role: saga-counter-evidence
  - kind: knowledge
    ref: pitfall/idempotency-implementation-pitfall
    role: compensation-safety-concern

perspectives:
  - name: Coordination Cost
    summary: 2PC blocks all participants for the duration of prepare; cost grows with N × max-rtt. Saga unblocks each step; cost grows with N × per-step-latency, no global block.
  - name: Failure Recovery
    summary: 2PC failure mid-commit leaves cluster in indeterminate state until recovery; saga failure leaves cluster in well-defined intermediate state with explicit compensation path.
  - name: Idempotency Burden
    summary: 2PC participants must hold locks; saga participants must hold idempotency keys. Different operational burdens — memory vs storage.
  - name: When 2PC Wins
    summary: At N=2 with low failure rate, 2PC's atomicity is cheap and compensation infra is overhead.

external_refs: []

proposed_builds:
  - slug: saga-vs-2pc-microbenchmark
    summary: Microbenchmark harness comparing saga and 2PC at N ∈ {2, 3, 5, 8} services across failure rates {0%, 1%, 5%, 15%}. Measures p50/p99 latency, total cost per transaction, recovery time.
    scope: poc
    requires:
      - kind: skill
        ref: workflow/saga-pattern-data-simulation
        role: saga-implementation-baseline
      - kind: knowledge
        ref: pitfall/saga-pattern-implementation-pitfall
        role: avoid-known-saga-bugs-in-benchmark
        note: avoid-known-saga-bugs-in-benchmark

experiments:
  - name: saga-vs-2pc-crossover-point
    hypothesis: Crossover N is between 2 and 3; specifically, at N=2 2PC is ≥1.3x cheaper, at N=3 saga is ≥1.5x cheaper.
    method: Build the harness; run 100 transactions per (N, failure-rate) bucket; compare aggregate cost.
    status: planned
    built_as: null
    result: null
    supports_premise: null
    observed_at: null

outcomes: []

status: draft
retraction_reason: null
---

# Saga vs 2PC: At what N does saga become cheaper?

## Introduction

**If** a multi-step distributed transaction can be implemented as either saga (forward + compensation) or 2PC (synchronous prepare / commit), **then** saga is cheaper when N ≥ 3 services AND failure rate is non-trivial; 2PC is cheaper when N = 2. The crossover sits between N=2 and N=3 in typical workloads.

### Background

The hub carries the saga shape (`workflow/saga-pattern-data-simulation`) and pitfall (`pitfall/saga-pattern-implementation-pitfall`), but no comparable 2PC technique. The community wisdom — "use saga for distributed transactions" — is true for N ≥ 3 but is often wrongly applied at N = 2 where 2PC's simplicity wins.

### Prior art

`/hub-research` would pull: Google Spanner's TrueTime+2PC vs choreography-based saga deployments, academic papers on coordination cost in distributed transactions.

## Methods

(planned — see `experiments[0].method` in frontmatter for the full design. This section becomes substantive when `status: implemented` and is checked for length by `_audit_paper_imrad.py` at that point.)

## Results

(pending — experiment status: planned. Run `/hub-paper-experiment-run <slug>` once the experiment completes to populate this section from `experiments[0].result`.)

## Discussion

(see frontmatter)

### Proposed builds (rationale)

(see frontmatter)

### Limitations

- Crossover claim is qualitative-quantitative (between N=2 and N=3) but needs the experiment to fix the constant
- Real systems blend the two — practical "saga that uses 2PC for the inner pair" hybrids exist; this paper treats them as pure
- N treats services as homogeneous; real systems have heterogeneous failure rates per service

<!-- references-section:begin -->
## References (examines)

**technique — `workflow/safe-bulk-pr-publishing`**
shape-comparison-baseline-for-multi-step

**skill — `workflow/saga-pattern-data-simulation`**
saga-shape

**knowledge — `pitfall/saga-pattern-implementation-pitfall`**
saga-counter-evidence

**knowledge — `pitfall/idempotency-implementation-pitfall`**
compensation-safety-concern


## Build dependencies (proposed_builds)

### `saga-vs-2pc-microbenchmark`  _(scope: poc)_

**skill — `workflow/saga-pattern-data-simulation`**
saga-implementation-baseline

**knowledge — `pitfall/saga-pattern-implementation-pitfall`**
avoid-known-saga-bugs-in-benchmark

<!-- references-section:end -->

## Provenance

- Authored 2026-04-25, batch of 10 papers
- Schema: `docs/rfc/paper-schema-draft.md`
- Body migrated to IMRaD structure 2026-04-25 per `docs/rfc/paper-schema-draft.md` §5 by `_migrate_paper_to_imrad.py`. Pre-IMRaD body is preserved in git history; no semantic claims were rewritten during the migration. For hypothesis-type drafts, Methods + Results sections are stubs until the experiment completes.
