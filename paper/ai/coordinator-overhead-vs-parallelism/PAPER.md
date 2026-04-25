---
version: 0.2.0-draft
name: coordinator-overhead-vs-parallelism
description: "Multi-agent coordinator overhead vs parallelism gain: hypothesis sweet spot is N=4-6 sub-agents, past N=8 net negative"
category: ai
tags: [multi-agent, coordinator-overhead, parallelism, scaling, hypothesis]
type: hypothesis

premise:
  if: A multi-agent orchestrator dispatches N parallel sub-agents
  then: Coordinator overhead (synthesis time + scope partitioning + result reconciliation) grows with N while parallelism gain saturates past N=4. Past N=8 in typical workloads, coordinator overhead exceeds parallelism gain — net negative outcome.

examines:
  - kind: skill
    ref: agents/basic-agent-runner
    role: agent-runtime-baseline
  - kind: skill
    ref: ai/ai-subagent-scope-narrowing
    role: scope-discipline-baseline
  - kind: skill
    ref: workflow/bulkhead-data-simulation
    role: isolation-baseline
  - kind: knowledge
    ref: agent-orchestration/grep-existing-annotations-before-parallel-subagent-dispatch
    role: counter-evidence-from-prior-paper
  - kind: paper
    ref: workflow/parallel-dispatch-breakeven-point
    role: prior paper establishing parallel-dispatch can be net negative — this paper extends to the coordinator-overhead axis

perspectives:
  - name: Coordinator Time is Serial
    summary: Result synthesis runs after all sub-agents finish. Synthesis cost grows with N (more results to merge). At some N, synthesis time exceeds the longest sub-agent's runtime.
  - name: Scope Partitioning Quality Degrades with N
    summary: Splitting one task into 2 disjoint scopes is easy; into 8 is hard. Bad partitioning causes scope overlap (waste) or scope gaps (incomplete results). Cost compounds with N.
  - name: Token Cost Compounding
    summary: Each sub-agent consumes its own context tokens. Coordinator must consume their results tokens. Total tokens grow superlinearly with N for non-trivial syntheses.
  - name: Sweet Spot Hypothesis
    summary: Empirical observation in this paper's prior work suggests N=4-6 captures most of the parallelism gain at acceptable coordinator cost. Past N=8 the curve inverts.

external_refs: []

proposed_builds:
  - slug: coordinator-overhead-benchmark
    summary: Benchmark dispatching same task at N ∈ {1, 2, 4, 6, 8, 12} sub-agents; measure wall-clock, total tokens, synthesis time, sub-agent average idle time. Plot the curve.
    scope: poc
    requires:
      - kind: skill
        ref: agents/basic-agent-runner
        role: harness-runtime
      - kind: knowledge
        ref: agent-orchestration/grep-existing-annotations-before-parallel-subagent-dispatch
        role: pre-flight-check-pattern

experiments:
  - name: coordinator-curve
    hypothesis: Wall-clock improvement plateaus past N=4. Total cost (tokens × time) is minimized at N=4-6. At N=8, total cost is ≥1.5x the N=4 baseline.
    method: Dispatch a representative task (e.g. annotate 100 files) at each N; measure end-to-end metrics; plot wall-clock and cost curves.
    status: planned
    built_as: null
    result: null
    supports_premise: null
    observed_at: null

outcomes: []

status: draft
retraction_reason: null
---

# Multi-Agent Coordinator: Overhead vs Parallelism

## Premise

(see frontmatter)

## Background

`technique/ai/multi-agent-fan-out-with-isolation` describes the shape; this paper measures the curve.

## Perspectives

(see frontmatter)

## External Context

`paper/workflow/parallel-dispatch-breakeven-point` already established that parallel dispatch can be net negative at high prior coverage; this paper extends that finding to the coordinator-overhead axis.

## Limitations

- Highly task-dependent; "typical workloads" assumption is fragile
- Coordinator overhead is partly an artifact of current LLM token-based pricing; cheaper inference would shift the curve right
- Parallelism gain assumes independent sub-tasks; real tasks have implicit dependencies that compound at high N

## Provenance

- Authored 2026-04-25, batch of 10
- Sibling: `paper/parallel-dispatch-breakeven-point` (different axis, same parent claim that parallelism has a ceiling)
