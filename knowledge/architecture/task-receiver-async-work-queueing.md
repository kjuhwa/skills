---
version: 0.1.0-draft
name: task-receiver-async-work-queueing
summary: Async work queue for receiving tasks from hub, applying updates, managing task state
category: architecture
confidence: medium
tags: [evolver, architecture, task-queue, async, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/taskReceiver.js
imported_at: 2026-04-18T00:00:00Z
---

# Async task receiver between hub and agent

The hub can hand work to the agent (e.g., "run evolution on schema X", "validate skill Y"). The receiver maintains a local queue, pulls from the hub on a cadence, dispatches to a worker, and reports state transitions.

## States

`pending → running → completed | failed | cancelled`

Persist state to disk so crashes don't lose work. Emit state transitions as events so the hub can render progress.

## Why a receiver and not direct RPC

- Survives hub outages — the queue is local.
- Lets the agent pace itself (bounded concurrency, backoff on resource pressure).
- Clean retry semantics — a failed task can be re-enqueued with a new attempt counter.

## Reuse notes

Same shape as any "control-plane pushes work to data-plane worker" setup — Kubernetes jobs, SaaS webhook processors, edge-device update agents. The queue file is the contract; everything else is implementation detail.
