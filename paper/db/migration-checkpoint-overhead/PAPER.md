---
version: 0.2.0-draft
name: migration-checkpoint-overhead
description: "Per-row checkpoint vs per-batch: hypothesis per-row checkpointing turns crash-safety into the migration's bottleneck"
category: db
tags: [migration, checkpoint, granularity, overhead, hypothesis]
type: hypothesis

premise:
  if: A long-running migration adds checkpoint persistence at progressively finer granularity (per-batch → per-row)
  then: Per-batch (thousands of rows per checkpoint write) adds <5% overhead. Per-row checkpointing makes the checkpoint table itself the bottleneck — migration runs 10-50x slower because every row requires two writes (data + checkpoint). Recommended granularity is per-batch, not per-row.

examines:
  - kind: skill
    ref: backend/migration-processor-pipeline
    role: migration-shape
  - kind: skill
    ref: workflow/idempotency-data-simulation
    role: idempotency-discipline
  - kind: knowledge
    ref: pitfall/idempotency-implementation-pitfall
    role: counter-evidence
  - kind: knowledge
    ref: pitfall/dead-letter-queue-implementation-pitfall
    role: failed-row-handling

perspectives:
  - name: Resume Granularity vs Write Cost
    summary: Per-row checkpoint allows resume at any row, costing 2× writes per row. Per-batch checkpoint resumes at batch boundary, costing 1 write per batch. The granularity tradeoff is the heart of the design choice.
  - name: Crash Probability Determines Optimum
    summary: If crashes are rare (well-tested infra), per-batch is sufficient — at most one batch is re-run on resume. If crashes are frequent, per-row may be justified for very long batches.
  - name: Storage I/O Pattern
    summary: Per-row checkpoint serializes I/O (no batch-write coalescing). Per-batch enables I/O batching, hitting the database's optimal write throughput.
  - name: Lock Contention
    summary: Per-row checkpoint acquires the checkpoint table's lock per row. In high-concurrency environments, this can become its own contention point.

external_refs: []

proposed_builds:
  - slug: migration-checkpoint-granularity-benchmark
    summary: Benchmark same migration at three checkpoint granularities (per-row, per-100-rows, per-1000-rows) on a representative workload (1M rows). Measure wall-clock, checkpoint write count, recovery time after kill -9.
    scope: poc
    requires:
      - kind: skill
        ref: backend/migration-processor-pipeline
        role: migration-pipeline-baseline
      - kind: skill
        ref: workflow/idempotency-data-simulation
        role: idempotency-pattern

experiments:
  - name: checkpoint-granularity-cost
    hypothesis: Per-row checkpoint is ≥10x slower than per-1000-row checkpoint at 1M rows. Recovery time after crash is roughly equal across granularities (single batch lost in the worst case for per-batch, single row for per-row).
    method: Run benchmark at all three granularities; kill mid-run at random points; measure resume + complete time.
    status: planned
    built_as: null
    result: null
    supports_premise: null
    observed_at: null

outcomes: []

status: draft
retraction_reason: null
---

# Migration Checkpoint Granularity

## Premise

(see frontmatter)

## Background

`technique/db/idempotent-migration-with-resume-checkpoint` describes the pattern but does not specify granularity. Practitioners default to either too-fine (per-row) or no-checkpoint. This paper argues for per-batch as the canonical choice.

## Perspectives

(see frontmatter)

## Limitations

- Database-specific; SQLite, Postgres, MongoDB have different write-amplification characteristics
- Crash-frequency assumption is hard to validate; this paper assumes well-tested production infra
- Does not consider distributed migrations across multiple workers (different checkpointing concerns)

## Provenance

- Authored 2026-04-25, batch of 10
