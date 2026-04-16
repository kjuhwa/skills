---
name: cqrs-data-simulation
description: Generate paired command streams and derived read-model states with deliberate consistency lag for realistic CQRS demos
category: workflow
triggers:
  - cqrs data simulation
tags:
  - auto-loop
version: 1.0.0
---

# cqrs-data-simulation

CQRS simulations need two coordinated data generators, not one. The command generator produces a stream of intents with realistic validation failures (≈10–15% rejection rate for invalid state transitions like "cancel an already-shipped order") so the write side shows meaningful business rule enforcement. Each accepted command emits 1–N domain events with monotonically increasing sequence numbers scoped per aggregate; store these in an append-only log so replay and time-travel features work without extra machinery. Seed the event log with ~200–500 events across 20–40 aggregates to make projections look lived-in rather than empty.

Derive read-model state by folding events through projection functions — never generate read models directly. This is the architectural discipline the simulation is teaching; shortcutting it produces a demo that lies about how CQRS works. Build at least two projections with different shapes (e.g., a per-aggregate detail view and a cross-aggregate summary/count view) so users see that one event feeds many views with different update costs. Add a configurable projection lag (0ms / 50ms / 500ms / manual-step) to let users scrub between "looks synchronous" and "obviously eventual" regimes.

For arena/replay variants, bundle scenarios as named event-log fixtures (happy-path, concurrent-writes, poison-event, rebuild-from-zero) rather than randomizing every run. Deterministic scenarios let users compare their mental model to actual outcomes, which is the whole point of an interactive demo. Include a "rebuild projections from event 0" button to drive home that read models are disposable and events are the source of truth.
