---
name: actor-model-data-simulation
description: Deterministic actor-system simulation loop for mailbox, supervision, and flow-orchestration demos
category: workflow
triggers:
  - actor model data simulation
tags:
  - auto-loop
version: 1.0.0
---

# actor-model-data-simulation

Drive actor demos with a single logical clock (tick counter) rather than wall-clock setTimeout chains — this makes runs reproducible, seekable, and testable. Model each actor as `{id, mailbox: Message[], behavior, state, parent, children, restartCount}` and each message as `{from, to, payload, sentAt, deliverAt}`. On every tick: (1) advance the in-flight message queue and move any message whose `deliverAt <= now` onto the target's mailbox tail; (2) for each non-crashed actor, dequeue at most one message head and run its behavior, which may produce new outbound messages, state transitions, spawn calls, or explicit crashes; (3) for each crash, walk up to the supervisor and apply the configured strategy (one-for-one restarts the child; one-for-all restarts all siblings; rest-for-one restarts the crashed child and everything started after it).

Seed all randomness (message latency jitter, failure injection, arrival bursts) from a single PRNG with a user-visible seed input so scenarios can be shared and replayed. For mailbox-focused apps (actor-mailbox-simulator), parametrize arrival rate, service time distribution, and mailbox capacity — then record per-tick metrics (queue depth, drop count, throughput) for the visualization layer to chart. For orchestration apps, expose preset scenarios (request/reply, scatter-gather, pipeline, saga-with-compensation) as arrays of seeded initial messages.

Keep the simulation engine pure and framework-agnostic: `step(state) -> state`. The UI subscribes to snapshots, never mutates engine state directly. This separation lets you add time-travel debugging (store snapshots per tick), export runs as JSON, and unit-test supervision rules without rendering.
