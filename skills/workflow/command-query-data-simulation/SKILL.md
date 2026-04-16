---
name: command-query-data-simulation
description: Seed-and-stream simulation workflow that generates interleaved command/query operations with realistic names, durations, and handler responses.
category: workflow
triggers:
  - command query data simulation
tags:
  - auto-loop
version: 1.0.0
---

# command-query-data-simulation

Command-query simulations share a common data generation pattern: a typed entry object containing an operation type (command or query), a domain-specific name drawn from curated pools, a timestamp, and a measurable attribute like duration or handler result. The timeline app seeds 12 entries at startup using weighted randomness (60% queries, 40% commands) and caps the rolling window at 30 entries, shifting old ones out. The bus simulator dispatches 6 seed operations on staggered 400ms intervals to demonstrate the animated flow. Both use parallel arrays of realistic operation names — commands are verbs (CreateUser, UpdateOrder, DeleteItem, PublishEvent) and queries are accessors (GetUsers, FindOrder, ListItems, CountEvents).

The reusable simulation workflow follows three phases: (1) seed phase — generate N initial entries with weighted type distribution to show a realistic starting state, (2) interactive phase — let the user dispatch ad-hoc operations with type selection and optional naming, and (3) response phase — commands yield a state-mutation acknowledgment ("state mutated") while queries yield a data-return signal ("data returned"). Handler naming follows the convention of appending "Handler" to the operation name (CreateUserHandler, GetUsersHandler), mirroring real CQRS bus implementations. Duration values are randomized within a bounded range (20–100ms) to simulate realistic variance.

For the CQS analyzer, the simulation takes a different form: instead of generating runtime events, it provides a sample class with methods that represent pure commands (void mutators), pure queries (side-effect-free getters), and intentional violations (methods that both mutate and return). The detection heuristics check for `return` statements combined with `this.*` assignments, `.push()`, `.splice()`, or `console.log()` calls. This three-bucket classification (command / query / violation) is the core data model that all command-query simulations should produce.
