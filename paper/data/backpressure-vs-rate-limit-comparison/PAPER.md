---
version: 0.2.0-draft
name: backpressure-vs-rate-limit-comparison
description: "Backpressure vs rate-limit: hypothesis backpressure wins for variable consumers, rate-limit wins for untrusted producers"
category: data
tags: [backpressure, rate-limit, flow-control, hypothesis, tradeoff]
type: hypothesis

premise:
  if: A system needs to control producer rate to match consumer capacity
  then: >-
    Backpressure outperforms rate-limiting (≥30% lower drop rate at the same throughput
    target) when consumer-capacity coefficient of variation σ/μ ≥ 0.3. Rate-limiting
    outperforms backpressure (≥50% lower buffer-overflow rate) when the producer is
    uncontrolled — i.e., ≥10% of inbound traffic originates outside the SLO contract.
    Below the pair (σ/μ < 0.2, untrusted-share < 5%), both perform within 10% of each
    other and the default choice is moot.

examines:
  - kind: skill
    ref: workflow/backpressure-data-simulation
    role: backpressure-shape
  - kind: knowledge
    ref: pitfall/backpressure-implementation-pitfall
    role: backpressure-counter-evidence
  - kind: knowledge
    ref: pitfall/rate-limiter-implementation-pitfall
    role: rate-limit-counter-evidence
  - kind: knowledge
    ref: pitfall/dead-letter-queue-implementation-pitfall
    role: overflow-failure-mode

perspectives:
  - name: Producer Trust
    summary: Backpressure assumes the producer is cooperative — it reads the signal and slows. Untrusted producers ignore the signal. Rate limiting works on hostile producers because the cap is enforced by the consumer side.
  - name: Consumer Variability
    summary: Backpressure adapts to consumer capacity in real time. Rate limiting requires a static cap; if consumer slows below the cap, backpressure recovers but rate limiting wastes capacity.
  - name: Failure Mode Asymmetry
    summary: Backpressure failure → buffer overflow → DLQ. Rate-limit failure → dropped requests at producer → silent customer impact. Different observability surface.
  - name: Hybrid Practicality
    summary: >-
      Production systems often combine both — rate limit for the outer perimeter
      (untrusted), backpressure for inner pipelines (trusted). The paper's claim is
      about default choice when only one is allowed.

external_refs: []

proposed_builds:
  - slug: producer-control-decision-table
    summary: Knowledge-entry decision table mapping (producer-trust × consumer-capacity-variability × cost-tolerance) to recommended technique. Backed by benchmark data from the next experiment.
    scope: poc
    requires:
      - kind: knowledge
        ref: pitfall/backpressure-implementation-pitfall
        role: seed-data-point
      - kind: knowledge
        ref: pitfall/rate-limiter-implementation-pitfall
        role: seed-data-point

experiments:
  - name: backpressure-vs-rate-limit-workload-replay
    hypothesis: >-
      In a 4-cell workload matrix (consumer σ/μ ∈ {0.1, 0.5} × untrusted-share ∈ {0%, 25%}),
      backpressure achieves ≥30% lower drop rate at σ/μ ≥ 0.3 with trusted producer; rate-
      limiting achieves ≥50% lower buffer-overflow rate with ≥10% untrusted share. The
      crossover region (σ/μ ≈ 0.2, untrusted-share ≈ 5%) shows <10% delta between the two.
    method: >-
      Synthesize 4 workload generators (one per matrix cell). Run each for 5 minutes through
      both control mechanisms. Measure drop rate, p99 latency, total throughput, and DLQ
      depth. Compute pairwise % deltas per metric per cell.
    status: planned
    built_as: null
    result: null
    supports_premise: null
    observed_at: null

outcomes: []

status: draft
retraction_reason: null
---

# Backpressure vs Rate Limiting: Which Tool When?

## Introduction

(see frontmatter)

### Background

The hub has both the backpressure technique (`technique/data/producer-consumer-backpressure-loop`) and pitfalls for both backpressure and rate limiting. What is missing is the **decision rule** for when to pick which. Most teams default to one based on familiarity rather than the problem shape.

### Prior art

Useful sources via `/hub-research`: AWS API Gateway vs SQS-with-Lambda case studies, the "Tail at Scale" paper, Netflix's Hystrix retrospective.

## Methods

(planned — see `experiments[0].method` in frontmatter for the full design. This section becomes substantive when `status: implemented` and is checked for length by `_audit_paper_imrad.py` at that point.)

## Results

(pending — experiment status: planned. Run `/hub-paper-experiment-run <slug>` once the experiment completes to populate this section from `experiments[0].result`.)

## Discussion

(see frontmatter)

### Limitations

- The premise's "trusted producer" axis is binary; real systems have gradients (semi-trusted internal services)
- Paper treats latency and drop-rate as primary; production also cares about cost, observability, ops complexity
- 4 workload classes are a simplification of real distributions

<!-- references-section:begin -->
## References (examines)

**skill — `workflow/backpressure-data-simulation`**
backpressure-shape

**knowledge — `pitfall/backpressure-implementation-pitfall`**
backpressure-counter-evidence

**knowledge — `pitfall/rate-limiter-implementation-pitfall`**
rate-limit-counter-evidence

**knowledge — `pitfall/dead-letter-queue-implementation-pitfall`**
overflow-failure-mode


## Build dependencies (proposed_builds)

### `producer-control-decision-table`  _(scope: poc)_

**knowledge — `pitfall/backpressure-implementation-pitfall`**
seed-data-point

**knowledge — `pitfall/rate-limiter-implementation-pitfall`**
seed-data-point

<!-- references-section:end -->

## Provenance

- Authored 2026-04-25, batch of 10
- Sibling: `paper/parallel-dispatch-breakeven-point` (related cost-model paper)
- Body migrated to IMRaD structure 2026-04-25 per `docs/rfc/paper-schema-draft.md` §5 by `_migrate_paper_to_imrad.py`. Pre-IMRaD body is preserved in git history; no semantic claims were rewritten during the migration. For hypothesis-type drafts, Methods + Results sections are stubs until the experiment completes.
