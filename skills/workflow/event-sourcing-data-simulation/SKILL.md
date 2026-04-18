---

name: event-sourcing-data-simulation
description: Generate realistic causally-ordered event streams with aggregate lifecycles for replay demos
category: workflow
triggers:
  - event sourcing data simulation
tags: [workflow, event, sourcing, data, simulation]
version: 1.0.0
---

# event-sourcing-data-simulation

Synthetic event streams must respect aggregate invariants: every stream starts with a Created event, ends with no events after a Deleted/Closed event, and intermediate events reference a valid prior state. Build a per-aggregate state machine first (e.g., Order: Created → Submitted → Paid → Shipped → Delivered, with optional Cancelled branches), then walk it stochastically to emit events with monotonic sequence numbers, ISO-8601 timestamps spaced by realistic gaps (seconds for hot aggregates, hours/days for cold), and stable aggregateId/eventId UUIDs.

Each event needs causationId (the command that produced it) and correlationId (the workflow it belongs to) so downstream visualizations can draw causal arrows. Include a configurable "drift" knob: inject out-of-order delivery, duplicates, and gaps to stress-test idempotent projections. For replay-lab apps, seed the generator deterministically (seeded PRNG) so the same input always yields the same stream — this makes the time-travel scrubber reproducible across reloads.

Layer in projection-friendly variety: mix multiple aggregate types in one stream, vary payload sizes, occasionally emit compensating events (RefundIssued after Paid) to demonstrate the append-only nature. Persist the generated stream to a single JSONL file or in-memory ring buffer keyed by global offset so projectors can subscribe by offset and replay deterministically.
