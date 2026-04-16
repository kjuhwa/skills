---
name: cqrs-data-simulation
description: Simulating CQRS command writes, event sourcing projections, and asymmetric read/write latency with realistic data generation.
category: workflow
triggers:
  - cqrs data simulation
tags:
  - auto-loop
version: 1.0.0
---

# cqrs-data-simulation

The data simulation pattern across these CQRS apps follows a three-layer model: command generation, event store accumulation, and read-model projection. In the command-query-split app, `dispatch(type, payload)` creates an immutable event object `{ id, type, payload, ts }` and appends it to an ever-growing `eventStore` array. The `applyEvent()` function then folds each event into a mutable `state` object (incrementing counters for users, orders, shipped), simulating how a CQRS read model is rebuilt by replaying the event log. Initial seeding is done via a timed loop—`setTimeout` with staggered delays—to populate the store with realistic-looking history on load. This append-only-then-project pattern is the core reusable simulation for any event-sourced CQRS demo.

The latency monitor simulates the performance asymmetry that defines production CQRS systems. Command latency is generated as `20 + random()*40` with a 10% chance of a +60ms spike (simulating write contention, event persistence overhead, or saga coordination), while query latency is `3 + random()*12` (simulating optimized denormalized read stores). A sliding window (`MAX=60`) with `push/shift` maintains bounded memory. Rolling averages and a cmd/qry ratio metric are computed on every tick, providing the kind of derived KPIs that real CQRS monitoring needs. The 800ms update interval balances visual smoothness against realism.

The event-flow app adds a spatial simulation layer: each command spawns 3 particles with randomized Y-positions and velocities (`vx: 1.5 + random()`), representing events propagating through the event bus from write side to read side. Particle lifetime (80 frames) governs how far events travel before fading, visually encoding eventual consistency—events don't arrive instantly. The read model (`{ orders, stock, cancelled }`) is updated synchronously for simplicity, but the particle travel time creates the visual impression of propagation delay. This particle-per-event pattern is reusable for animating any message-bus or event-driven flow.
