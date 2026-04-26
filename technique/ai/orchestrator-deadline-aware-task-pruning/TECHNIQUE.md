---
version: 0.2.0-draft
name: orchestrator-deadline-aware-task-pruning
description: "Orchestrator drops in-flight low-value tasks as wall-clock deadline approaches; prioritizes finishing critical-path work."
category: ai
tags:
  - orchestrator
  - deadline
  - task-pruning
  - critical-path
  - wall-clock-budget

composes:
  - kind: skill
    ref: workflow/bucket-parallel-java-annotation-dispatch
    version: "*"
    role: dispatch-mechanics
  - kind: knowledge
    ref: pitfall/rate-limiter-implementation-pitfall
    version: "*"
    role: budget-rule
  - kind: knowledge
    ref: pitfall/ai-guess-mark-and-review-checklist
    version: "*"
    role: ai-output-guard

recipe:
  one_line: "Each task has deadline + priority. Orchestrator estimates remaining wall-clock per task. As global deadline approaches, low-priority + high-remaining tasks pruned (cancel + emit PARTIAL marker), critical-path tasks retain full budget."
  preconditions:
    - "Tasks have explicit priority + estimated remaining time"
    - "Global deadline meaningful (release window, SLA, user impatience)"
    - "Partial completion has value (vs all-or-nothing tasks)"
  anti_conditions:
    - "Tasks all-or-nothing — pruning destroys all value"
    - "No global deadline — pruning has no triggering condition"
    - "Tasks lack remaining-time estimate — orchestrator can't decide what to cut"
  failure_modes:
    - signal: "Critical-path task pruned because estimate was wrong"
      atom_ref: "skill:workflow/bucket-parallel-java-annotation-dispatch"
      remediation: "Critical-path tasks marked DO-NOT-PRUNE; estimate refresh per checkpoint, not at start"
    - signal: "Pruning conflated with rate-limit; throttles instead of cancels"
      atom_ref: "knowledge:pitfall/rate-limiter-implementation-pitfall"
      remediation: "Pruning = cancel + emit PARTIAL marker. Throttle = slow down. Distinct mechanisms."
    - signal: "Pruned task's PARTIAL marker hallucinated to look complete"
      atom_ref: "knowledge:pitfall/ai-guess-mark-and-review-checklist"
      remediation: "PARTIAL envelope explicit: status=cancelled-pre-deadline + completion% + reason; downstream must check"
  assembly_order:
    - phase: assign-deadline-and-priority
      uses: dispatch-mechanics
    - phase: monitor-remaining-time
      uses: budget-rule
      branches:
        - condition: "deadline approaching + low-priority tasks running"
          next: prune
        - condition: "on-track"
          next: continue
    - phase: prune
      uses: ai-output-guard
    - phase: emit-partial-markers
      uses: ai-output-guard

binding: loose

verify:
  - "every composes[].ref resolves on disk"
  - "the technique distinguishes pruning (cancel + PARTIAL) from throttling (slow down)"
---

# Orchestrator Deadline-Aware Task Pruning

> Tasks have deadline + priority + estimated remaining time. As global deadline approaches, low-priority + high-remaining tasks pruned (cancel + PARTIAL marker). Critical-path tasks marked DO-NOT-PRUNE retain full budget.

## When to use
- Tasks have priority + remaining-time estimate
- Global deadline meaningful (SLA, release window)
- Partial completion has value

## When NOT to use
- Tasks all-or-nothing
- No global deadline
- No remaining-time estimate

## Glue summary
| Added element | Where |
|---|---|
| DO-NOT-PRUNE marking for critical-path | Setup |
| Pruning vs throttling distinction | Decision |
| Explicit PARTIAL envelope (status+completion%+reason) | Cancellation |

## Provenance
- Authored 2026-04-26 in batch with 9 sibling orchestrator techniques
