---

name: cqrs-data-simulation
description: Generate correlated command/event/projection streams with tunable skew so read-model lag and replay behavior are observable.
category: workflow
triggers:
  - cqrs data simulation
tags: [workflow, cqrs, data, simulation]
version: 1.0.0
---

# cqrs-data-simulation

Drive CQRS demos from a single synthetic command generator that emits a mix of accepted and rejected commands at a configurable rate, then derive the event stream deterministically from accepted commands only. Each event carries an aggregate id, monotonic sequence number, event type, and payload; projectors consume the stream with independently tunable throughput so you can force one read model to fall behind while another stays current. This makes the "read models diverge in real time" property visible without hand-crafted fixtures.

Seed a realistic workload by mixing command families — create, update, and invalidating commands like cancel/refund — weighted so roughly 10–20% exercise rejection paths (optimistic concurrency conflicts, validation failures, idempotency collisions). For event sourcing variants, maintain an append-only log with snapshot checkpoints every N events and expose a replay knob that rewinds to any offset; the simulator should reconstruct read models from scratch and show convergence times. For read-model-racer style demos, run two or more projectors with different processing costs (e.g., a fast counter vs. a slow full-text index) against the same event stream.

Parameterize at minimum: command rate, rejection ratio, per-projector processing latency, snapshot interval, and a fault-injection toggle that pauses or crashes a projector. These five knobs cover the behaviors worth teaching — backpressure on the read side, replay duration, snapshot speedup, and divergence between projections sharing one log.
