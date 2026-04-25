---
version: 0.1.0-draft
name: idle-scheduler-background-tasks
summary: Schedule background maintenance tasks during idle periods — cleanup, distillation, reports
category: workflow
confidence: medium
tags: [evolver, workflow, scheduler, idle, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/idleScheduler.js
imported_at: 2026-04-18T00:00:00Z
---

# Idle-period maintenance scheduler

Run housekeeping only when the agent is quiescent. During idle windows (no active evolution for N minutes):

- archive old sessions,
- distill new skills from recent successes,
- regenerate personality reports,
- compact memory indexes,
- prune quarantined external assets past their retention window.

## Why idle-only

Background tasks contend with the primary loop for CPU, disk, and — more importantly — log attention. Deferring them to idle windows keeps active cycles lean and makes any housekeeping issue easy to attribute.

## Mechanism

- Monitor "last activity" timestamp.
- After the inactivity threshold, run tasks in priority order with individual time boxes.
- If activity resumes mid-task, cooperatively yield and re-queue.

## Reuse notes

Generalizes to any long-running process with expensive maintenance: log rotators, cache warmers, index compactors. The core insight is tying housekeeping to a *state* (idle) rather than a fixed schedule.
