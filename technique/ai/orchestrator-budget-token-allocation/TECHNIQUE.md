---
version: 0.2.0-draft
name: orchestrator-budget-token-allocation
description: "Per-task token / wall-clock budget allocated by orchestrator; tasks aborted when over-budget instead of running to completion."
category: ai
tags:
  - orchestrator
  - budget
  - token-allocation
  - timeout
  - cost-control

composes:
  - kind: skill
    ref: ai/ai-subagent-scope-narrowing
    version: "*"
    role: scope-bounding
  - kind: knowledge
    ref: pitfall/rate-limiter-implementation-pitfall
    version: "*"
    role: rate-vs-budget-distinction
  - kind: knowledge
    ref: pitfall/ai-guess-mark-and-review-checklist
    version: "*"
    role: ai-output-guard

recipe:
  one_line: "Orchestrator allocates per-task budget (tokens + wall-clock + tool calls). Worker reports usage at checkpoints. Over-budget tasks aborted with partial-result envelope; budget freed for queue."
  preconditions:
    - "Workers report usage incrementally (not just at end)"
    - "Budget granularity matches task class (e.g. 10K tokens for code-review, 50K for codebase-survey)"
    - "Partial results have value (vs all-or-nothing tasks where abort = total loss)"
  anti_conditions:
    - "Tasks have all-or-nothing semantics — abort destroys all value"
    - "Budget too coarse to differentiate task classes — single budget per all tasks misallocates"
    - "Workers can't report mid-stream — abort detection only at completion"
  failure_modes:
    - signal: "Budget conflated with rate-limit; orchestrator throttles instead of aborting"
      atom_ref: "knowledge:pitfall/rate-limiter-implementation-pitfall"
      remediation: "Budget = per-task ceiling (abort enforcement). Rate limit = per-window throttle. Distinct mechanisms; do not substitute"
    - signal: "Worker doesn't checkpoint; over-budget detected only at completion"
      atom_ref: "skill:ai/ai-subagent-scope-narrowing"
      remediation: "Mandate per-N-token checkpoints; orchestrator may force-abort between checkpoints if total exceeds 1.2× budget"
    - signal: "Aborted task partial-result hallucinated by AI to look complete"
      atom_ref: "knowledge:pitfall/ai-guess-mark-and-review-checklist"
      remediation: "Partial-result envelope marked PARTIAL with completion %; downstream consumer must check"
  assembly_order:
    - phase: allocate-budget
      uses: rate-vs-budget-distinction
    - phase: dispatch-with-budget
      uses: scope-bounding
    - phase: checkpoint-monitor
      uses: scope-bounding
      branches:
        - condition: "usage approaching budget"
          next: warn-or-abort
        - condition: "usage normal"
          next: continue
    - phase: warn-or-abort
      uses: ai-output-guard

binding: loose

verify:
  - "every composes[].ref resolves on disk"
  - "the technique distinguishes budget (per-task ceiling) from rate-limit (per-window throttle)"
---

# Orchestrator Budget Token Allocation

> Per-task budget (tokens + wall-clock + tool calls) allocated by orchestrator. Workers checkpoint usage. Over-budget = abort with PARTIAL envelope; budget freed for queue. Distinct from rate-limit (which throttles, not aborts).

## When to use
- Workers report usage incrementally
- Budget can match task class
- Partial results have value

## When NOT to use
- All-or-nothing tasks
- Single budget for all task classes
- Workers can't checkpoint mid-stream

## Glue summary
| Added element | Where |
|---|---|
| Budget vs rate-limit distinction | Allocation |
| Per-N-token checkpoint requirement | Dispatch |
| PARTIAL envelope marking | Abort path |

## Provenance
- Authored 2026-04-26 in batch with 9 sibling orchestrator techniques
