---
name: event-sourcing-data-simulation
description: Strategies for generating realistic synthetic event streams with causal ordering, aggregate boundaries, and conflict scenarios for frontend prototyping.
category: workflow
triggers:
  - event sourcing data simulation
tags:
  - auto-loop
version: 1.0.0
---

# event-sourcing-data-simulation

Generating convincing event-sourcing mock data requires more than random timestamps — it demands causal consistency. The bank app seeds its stream by walking a state machine: each account aggregate starts with an `AccountOpened` event, then alternates between `MoneyDeposited`, `MoneyWithdrawn`, and occasional `TransferInitiated` events, where withdrawal amounts are bounded by the running balance to avoid impossible states. The timeline app uses a simpler append model but enforces global sequence monotonicity and per-aggregate version vectors, ensuring that no event for aggregate A claims a version lower than a previously emitted one. Both approaches share a `nextEvent(currentState, rng)` generator pattern — a pure function that takes the current projection and a seeded random, returning the next valid event plus the updated state.

The replay app introduces conflict simulation by forking the stream at a chosen sequence number: two branches of events diverge, and the UI lets the user pick a resolution strategy (last-writer-wins, merge, or manual). To generate these forked streams, the simulator clones the aggregate state at the fork point, then runs two independent `nextEvent` chains with different random seeds. This is the hardest pattern to get right — the fork must produce events that are individually valid against the snapshot but mutually conflicting when merged (e.g., two concurrent withdrawals that together exceed the balance). The reusable technique is to snapshot the projection at the branch point and parameterize the two generators with constraints that guarantee at least one semantic conflict per fork.

When building your own event-sourcing simulations, control three knobs: (1) aggregate fan-out (number of independent streams, typically 3–10 for visual clarity), (2) event density (events per second per aggregate — keep it between 0.5 and 5 for real-time playback), and (3) snapshot frequency (insert a snapshot marker every N events so the replay scrubber can fast-forward). Seeded PRNGs (e.g., a simple mulberry32) ensure reproducibility across page reloads, which is essential for deterministic visual testing.
