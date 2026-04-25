---
version: 0.2.0-draft
name: change-stream-lock-contention-scaling-curve
description: "Does per-event lock in change-stream-resilient-consumer scale beyond N≈8 instances, or does contention dominate?"
category: backend
tags:
  - change-stream
  - distributed-lock
  - mongodb
  - scaling-curve
  - hypothesis
  - lock-contention

type: hypothesis

premise:
  if: A change-stream consumer applies per-event distributed lock for cross-instance coordination as N consumer instances grows
  then: Lock contention grows superlinearly past N≈8 instances; coordination win turns into bottleneck. Crossover is workload-shape dependent (rate × key cardinality); mitigation is keyspace sharding, not more instances.

examines:
  - kind: technique
    ref: backend/change-stream-resilient-consumer
    role: subject
    note: subject technique whose per-event lock claim is interrogated
  - kind: skill
    ref: backend/distributed-lock-mongodb
    role: atom-under-test
    note: per-event lock implementation evaluated for scaling behavior
  - kind: skill
    ref: backend/mongodb-changestream-field-filter
    role: filter-baseline
    note: relevance filter that gates which events incur lock cost
  - kind: knowledge
    ref: pitfall/mongodb-changestream-resubscribe
    role: counter-evidence
    note: orthogonal failure mode that lock contention may compound
  - kind: paper
    ref: workflow/parallel-dispatch-breakeven-point
    role: prior-paper
    note: prior paper on coordination cost displacement under parallelism

perspectives:
  - name: Lock Granularity Tradeoff
    summary: Per-event lock guarantees event-level exclusivity but pays N×lock-acquire on hot keys. Per-bucket lock loses event exclusivity for bounded contention — correctness granularity vs throughput.
  - name: Workload Shape Determines Crossover
    summary: Lock contention scales with event_rate × 1/key_cardinality. Low-card+high-rate (100 events/s on 5 hot keys) hits the wall fast; high-card+low-rate (1 event/s on 1000 keys) never contends at N=32.
  - name: Failure-Mode Shift Under Contention
    summary: Above crossover, retries cluster on hot keys; lock-acquire timeouts become the dominant failure signal, masking the change-stream-resubscribe pitfall the technique was originally designed to address.
  - name: Counter-Argument
    summary: Per-event is fine; just shard the deployment so each pod owns a disjoint slice of the keyspace. Lock granularity isn't the issue — workload partitioning at dispatch layer is.

external_refs: []

proposed_builds:
  - slug: lock-contention-benchmark
    summary: Monte Carlo simulating N consumer instances against synthetic change stream; measures lock-acquire p50/p99 + contention rate at N∈{2,4,8,16,32}; classifies cells ok/warn/bottleneck.
    scope: poc
    requires:
      - kind: skill
        ref: backend/distributed-lock-mongodb
        role: lock-under-test
        note: the per-event lock implementation evaluated
      - kind: technique
        ref: backend/change-stream-resilient-consumer
        role: subject
        note: technique whose claim is being benchmarked
  - slug: keyspace-sharding-helper
    summary: Helper that takes (collection, hash-bucket-count) and produces sharded lock keys, cutting contention by sharding the keyspace below per-event granularity.
    scope: poc
    requires:
      - kind: skill
        ref: backend/distributed-lock-mongodb
        role: lock-baseline
        note: the lock the helper wraps
  - slug: instance-count-decision-table
    summary: Knowledge entry mapping (event-rate × key-cardinality × instance-count) → recommended sharding strategy, backed by benchmark data from build [1].
    scope: poc
    requires:
      - kind: knowledge
        ref: pitfall/mongodb-changestream-resubscribe
        role: orthogonal-failure-mode
        note: known failure mode the table must distinguish from contention

experiments:
  - name: lock-contention-curve-measurement
    hypothesis: At N=8 instances per-event lock contention exceeds 50% acquire-fail rate on workloads with key-cardinality ≤10 and rate ≥50 events/s. 16-bucket sharding pushes the threshold to N≥32.
    method: |-
      4 workload shapes × N∈{2,4,8,16,32} × 2 lock variants (per-event /
      16-bucket sharded). 5 min each. Measure p50/p99, contention rate,
      throughput. See body §Methods for the full cell matrix.
    status: planned
    built_as: null
    result: null
    supports_premise: null
    observed_at: null

outcomes: []

status: draft
retraction_reason: null
---

# Change Stream Lock Contention Scaling Curve

## Introduction

The `backend/change-stream-resilient-consumer` technique recommends a per-event distributed lock to coordinate across multiple consumer instances. Its "Glue summary" lists per-change-event lock keying as one of four added elements; its "Known limitations" briefly mentions that lock contention scales with consumer count when many events match the same key, and recommends sharding the keyspace — but does not specify *when* sharding becomes necessary or how to detect the crossover.

This paper interrogates the per-event lock claim. The premise predicts a workload-conditional crossover past which the technique's coordination win turns into a bottleneck.

### Background

The subject technique (`change-stream-resilient-consumer`) ships with a known-limitation note about lock contention but no quantitative threshold. The composed atom (`distributed-lock-mongodb`) is general-purpose and doesn't characterize its own scaling behavior. The cited pitfall (`mongodb-changestream-resubscribe`) describes an orthogonal failure mode (silent termination) that contention-induced timeouts may mask.

The prior paper `workflow/parallel-dispatch-breakeven-point` established a similar shape on a different axis: coordination cost can dominate parallelism gain past some threshold. This paper applies the same lens to per-event lock contention.

### What this paper sets out to test

Whether per-event lock contention crosses a threshold past which keyspace sharding becomes necessary, and where that threshold lies as a function of (event rate × key cardinality × instance count).

## Methods

(planned — see `experiments[0].method` for the measurement skeleton)

The experimental harness simulates change-stream consumption under controlled workload shapes against two lock variants:

- **per-event** — the technique's recommended `distributed-lock-mongodb` keyed by change-event id (one lock per event)
- **16-bucket sharded** — the same lock keyed by `hash(event.documentKey._id) % 16` (one lock per bucket; 16 buckets per collection)

Workloads vary along two axes:

| Axis | Levels |
|---|---|
| Event rate | low (1 event/s), high (50 events/s) |
| Key cardinality | low (5 hot keys), high (1000 keys) |

Producing 4 workload shapes total. Instance counts step from N=2 to N=32: `{2, 4, 8, 16, 32}`. Each (workload × N × variant) cell runs for 5 minutes; the harness measures lock-acquire p50/p99 latency, contention rate (% of acquires that retried), throughput (events processed/sec).

Total cells: 4 workloads × 5 N values × 2 variants = **40 cells**. Deterministic seed.

## Results

(pending — experiment status is `planned`; this paper is in draft state. Will be populated when the benchmark runs and `/hub-paper-experiment-run` closes the loop.)

## Discussion

(pending)

The expected finding shape: a crossover threshold exists; per-event lock dominates below it, 16-bucket sharded dominates above it. The exact threshold values are workload-dependent. If the experiment refutes the threshold's existence (per-event lock scales cleanly to N=32 across all 4 workloads), the technique's "Known limitations" note overstates the problem and per-event lock is unconditionally safe at the tested scale — that's also a valuable finding.

If supported, the paper's outcome would produce:
- a `knowledge/decision/change-stream-lock-bucket-sharding-threshold` entry with the measured threshold
- a generalized `skill/backend/keyspace-sharded-mongodb-lock` skill abstracting the sharding pattern
- a body update to the `change-stream-resilient-consumer` technique replacing the qualitative "Known limitations" paragraph with a quantitative threshold

### Limitations

- 4 workload shapes is a coarse sampling. Real production workloads are mixtures and transitions; the cost-model harness doesn't compose them.
- The benchmark uses synthetic events; latency from real MongoDB driver round-trips, network jitter, and replica-set elections is excluded. A second-phase experiment against a real cluster would close that gap.
- 16-bucket sharded is one fixed choice. The optimal bucket count is itself workload-dependent (more buckets reduce contention but inflate key-namespace bookkeeping).
- The experiment measures contention; it does not measure correctness regression. If 16-bucket sharded loses event-level exclusivity in a way that produces double-processing, that's a separate cost the throughput numbers don't capture.

### Future work

1. Replicate the benchmark against historical incident data from production change-stream consumers, if available, to validate the synthetic workloads.
2. Extend the harness to cover the orthogonal failure mode — change-stream re-subscribe under contention. Does resubscribe latency compound the lock-timeout latency, or are the two failure modes independent?
3. Generalize the `keyspace-sharding-helper` to other distributed-lock implementations beyond MongoDB findAndModify.
4. Test with a sweep of bucket counts (4, 16, 64, 256) at the highest contention workload to characterize the bucket-count tradeoff curve.

<!-- references-section:begin -->
## References (examines)

**technique — `backend/change-stream-resilient-consumer`**
subject technique whose per-event lock claim is interrogated

**skill — `backend/distributed-lock-mongodb`**
per-event lock implementation evaluated for scaling behavior

**skill — `backend/mongodb-changestream-field-filter`**
relevance filter that gates which events incur lock cost

**knowledge — `pitfall/mongodb-changestream-resubscribe`**
orthogonal failure mode that lock contention may compound

**paper — `workflow/parallel-dispatch-breakeven-point`**
prior paper on coordination cost displacement under parallelism


## Build dependencies (proposed_builds)

### `lock-contention-benchmark`  _(scope: poc)_

**skill — `backend/distributed-lock-mongodb`**
the per-event lock implementation evaluated

**technique — `backend/change-stream-resilient-consumer`**
technique whose claim is being benchmarked

### `keyspace-sharding-helper`  _(scope: poc)_

**skill — `backend/distributed-lock-mongodb`**
the lock the helper wraps

### `instance-count-decision-table`  _(scope: poc)_

**knowledge — `pitfall/mongodb-changestream-resubscribe`**
known failure mode the table must distinguish from contention

<!-- references-section:end -->

## Provenance

- Authored 2026-04-26
- Subject: `paper/from-technique` flow against `technique/backend/change-stream-resilient-consumer` (greenfield v0.2 technique authored 2026-04-26 in #1148)
- Status: draft — `experiments[0]` is planned; the paper will move to `status=implemented` once the benchmark runs and `/hub-paper-experiment-run` closes the loop
- Related to prior closed-loop paper `workflow/parallel-dispatch-breakeven-point` (same coordination-cost-displacement shape on a different axis)
