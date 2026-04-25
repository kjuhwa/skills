---
version: 0.2.0-draft
name: backpressure-vs-rate-limit-comparison
description: "Backpressure vs rate-limit: hypothesis backpressure wins for variable consumers, rate-limit wins for untrusted producers"
category: data
tags: [backpressure, rate-limit, flow-control, hypothesis, tradeoff]
type: hypothesis

premise:
  if: A system needs to control producer rate to match consumer capacity
  then: Backpressure (consumer-driven feedback) outperforms rate limiting (producer-side cap) when consumer capacity is variable; rate limiting outperforms backpressure when producer is uncontrolled (untrusted external traffic). Choosing the wrong one causes either dropped traffic or wasted capacity.

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
    summary: Production systems often combine both: rate limit for the outer perimeter (untrusted), backpressure for inner pipelines (trusted). The paper's claim is about default choice when only one is allowed.

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
    hypothesis: Across 4 workload classes (steady, bursty, hostile, slow-consumer), backpressure wins ≥3 cases when producer is trusted; rate-limit wins ≥3 cases when producer is hostile.
    method: Synthesize 4 workload generators; run each through both control mechanisms; measure p99 latency, drop rate, total throughput.
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

## Premise

(see frontmatter)

## Background

The hub has both the backpressure technique (`technique/data/producer-consumer-backpressure-loop`) and pitfalls for both backpressure and rate limiting. What is missing is the **decision rule** for when to pick which. Most teams default to one based on familiarity rather than the problem shape.

## Perspectives

(see frontmatter)

## External Context

Useful sources via `/hub-research`: AWS API Gateway vs SQS-with-Lambda case studies, the "Tail at Scale" paper, Netflix's Hystrix retrospective.

## Limitations

- The premise's "trusted producer" axis is binary; real systems have gradients (semi-trusted internal services)
- Paper treats latency and drop-rate as primary; production also cares about cost, observability, ops complexity
- 4 workload classes are a simplification of real distributions

## Provenance

- Authored 2026-04-25, batch of 10
- Sibling: `paper/parallel-dispatch-breakeven-point` (related cost-model paper)
