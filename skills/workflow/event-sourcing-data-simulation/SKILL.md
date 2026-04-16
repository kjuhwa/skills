---
name: event-sourcing-data-simulation
description: Strategies for generating synthetic event streams with domain-typed events, versioned aggregates, and replay-capable stores for event-sourcing demos.
category: workflow
triggers:
  - event sourcing data simulation
tags:
  - auto-loop
version: 1.0.0
---

# event-sourcing-data-simulation

Event-sourcing simulations require three layers of synthetic data: **single-stream generation**, **multi-aggregate seeding**, and **replay orchestration**. For single-stream generation, define an event type palette tied to the domain (e.g., `['deposit', 'withdraw', 'fee', 'interest']`) and a factory function that stamps each event with a monotonic ID, a type, a payload, and a synthetic timestamp offset by index (`Date.now() + index * delta`) to guarantee causal ordering without relying on wall-clock time. Amounts are randomized within a bounded range (`Math.random() * 200 + 5`), and the stream is bootstrapped with an initial burst (e.g., 8 events via a `for` loop) so the UI is never empty on first render.

For multi-aggregate seeding, pre-define aggregate roots as static fixtures with a typed event array and explicit version numbers (`v: 1, 2, 3…`). Each aggregate type (`Order`, `User`, `Cart`) gets its own reducer function registered in a `reducers` map keyed by aggregate type. This lets a single `select(aggregate)` call swap the active stream and re-fold state without shared mutable state between aggregates. Events carry typed `data` payloads (`{ item: 'Gadget' }`, `{ sku: 'A1', qty: 2 }`) rather than flat fields, so the reducer can destructure domain-specific shapes.

Replay orchestration clears the store, then re-appends saved events one-by-one with an async delay (`setTimeout(resolve, 300)`) between each step, calling the full render pipeline (rebuild state → update log → redraw visualization) after every append. This makes event replay visually observable and verifies that the fold function is truly idempotent — the final state after replay must match the pre-replay state. For continuous simulation, an auto-emit mode (`setInterval(emitEvent, 1200)`) with a toggle button provides a steady-state event stream for stress-testing projections and observing eventual consistency lag across multiple read models.
