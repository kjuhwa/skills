---
version: 0.2.0-draft
name: orchestrator-priority-queue-preemption
description: "Priority queue with preemption — orchestrator pauses lower-priority running task to dispatch higher-priority arrival, resumes after."
category: ai
tags:
  - orchestrator
  - priority-queue
  - preemption
  - resource-arbitration
  - resume

composes:
  - kind: skill
    ref: workflow/bucket-parallel-java-annotation-dispatch
    version: "*"
    role: dispatch-mechanics
  - kind: knowledge
    ref: pitfall/backpressure-implementation-pitfall
    version: "*"
    role: backpressure-discipline
  - kind: knowledge
    ref: pitfall/ai-guess-mark-and-review-checklist
    version: "*"
    role: ai-state-guard

recipe:
  one_line: "Tasks tagged with priority. Higher priority arrival preempts lower-running task — running task pauses, state checkpointed, slot freed for higher. Lower resumes after higher completes (or yields by deadline)."
  preconditions:
    - "Tasks support pause/resume (incremental progress, no all-or-nothing)"
    - "Priority levels well-defined (e.g. interactive=10, batch=5, background=1)"
    - "Resource pool size finite — preemption is the resolution mechanism"
  anti_conditions:
    - "Tasks all-or-nothing — pause = restart, preemption defeats progress"
    - "All tasks same priority — preemption never fires"
    - "Resource pool unbounded — no need to preempt, just spawn"
  failure_modes:
    - signal: "Lower-priority task starvation; never resumes because higher-priority arrivals continuous"
      atom_ref: "knowledge:pitfall/backpressure-implementation-pitfall"
      remediation: "Aging — paused task priority increases over time; eventually overtakes new arrivals"
    - signal: "Preemption thrashing; pause+resume overhead dominates work"
      atom_ref: "skill:workflow/bucket-parallel-java-annotation-dispatch"
      remediation: "Hysteresis — preempt only if priority gap ≥ 2; minor differences ignored"
    - signal: "Resumed task uses stale state (changed during pause)"
      atom_ref: "knowledge:pitfall/ai-guess-mark-and-review-checklist"
      remediation: "Checkpoint snapshot full state at pause; resume validates inputs unchanged or restarts cleanly"
  assembly_order:
    - phase: priority-tag-on-arrival
      uses: dispatch-mechanics
    - phase: check-against-running
      uses: backpressure-discipline
      branches:
        - condition: "arrival priority > running + threshold"
          next: preempt
        - condition: "arrival priority ≤ running"
          next: queue
    - phase: preempt
      uses: ai-state-guard
    - phase: resume-paused
      uses: ai-state-guard

binding: loose

verify:
  - "every composes[].ref resolves on disk"
  - "the technique includes aging to prevent starvation"
---

# Orchestrator Priority Queue with Preemption

> Tasks tagged with priority. Higher arrival preempts lower running — pause + checkpoint + free slot for higher. Lower resumes after. Aging prevents starvation; hysteresis prevents thrashing.

## When to use
- Tasks support pause/resume
- Priority levels well-defined
- Resource pool finite

## When NOT to use
- Tasks all-or-nothing
- Uniform priority
- Unbounded pool (just spawn)

## Glue summary
| Added element | Where |
|---|---|
| Aging (paused priority increases over time) | Anti-starvation |
| Hysteresis (preempt only if gap ≥ 2) | Anti-thrashing |
| Full-state checkpoint at pause | Pause |

## Provenance
- Authored 2026-04-26 in batch with 9 sibling orchestrator techniques
