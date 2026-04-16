---
name: cqrs-data-simulation
description: Generate command/event/query streams with tunable write-read lag for CQRS demo apps
category: workflow
triggers:
  - cqrs data simulation
tags:
  - auto-loop
version: 1.0.0
---

# cqrs-data-simulation

Simulate CQRS workloads as three independent but causally-linked streams: a command stream (Poisson-ish arrivals, ~5–50 cmd/s), a derived event stream (1..N events per command, emitted to an in-memory event log), and a query stream (independent rate, typically 3–10× command rate to reflect real read-heavy CQRS workloads). The projector should consume events asynchronously with a configurable delay + jitter — never synchronously, or the demo collapses into plain CRUD.

For event-sourced-counter, seed the event log with a deterministic sequence (Incremented, Incremented, Decremented, Reset, …) so replay is reproducible; expose a `seed` parameter for shareable demo states. For read-write-split-lab, simulate two physical stores (write-store Map, read-store Map) and a projector worker that drains the event queue on an interval — tune both the drain interval and batch size to show throughput vs. staleness tradeoffs. Inject occasional projector failures (configurable error rate, ~1–5%) and retries to demonstrate at-least-once delivery and idempotent projection handlers.

Always expose the simulation knobs (command rate, projection lag, error rate, batch size) as live sliders, not config constants, so users can break the system in real time and observe staleness bounds.
