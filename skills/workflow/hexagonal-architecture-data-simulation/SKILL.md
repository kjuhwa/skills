---

name: hexagonal-architecture-data-simulation
description: Seed realistic port traffic with paired driving/driven adapter pairs and domain invariants that make violations visible
category: workflow
triggers:
  - hexagonal architecture data simulation
tags: [workflow, hexagonal, architecture, data, simulation]
version: 1.0.0
---

# hexagonal-architecture-data-simulation

Generate simulation data as triples of (driving request, domain operation, driven side-effect) so every scenario exercises a full hexagon traversal. For hexagonal-ports-adapters-playground, pre-seed 3-5 adapter pairs per port type: HTTP+CLI on the driving side, Postgres+InMemory+Kafka on the driven side, and cycle which adapter is "active" so users see the domain core stays untouched when adapters swap. Each simulated request carries a schema like `{portId, direction: 'in'|'out', payloadShape, domainOp, expectedInvariants}` so the renderer can flag when a driven adapter is called without a corresponding driving entry (leaky adapter) or when the domain op list is empty (anemic passthrough).

For hexagonal-dependency-inverter, also seed deliberate violation scenarios — a domain entity that "imports" an adapter type, an adapter that bypasses its port — tagged with `violation: true` so the visualization can switch modes between "clean" and "anti-pattern" with a toggle. Include at least one case where two driven adapters fulfill the same port (e.g. primary DB + read replica) to show that ports are 1:N with adapters. For hexagonal-request-tracer, each simulated request needs monotonic per-hop timestamps and at least one retry/fallback branch so the trace timeline has interesting structure rather than a flat line.

Keep payloads small (≤5 fields) but semantically plausible — use `OrderPlaced`, `PaymentCaptured`, `InventoryReserved` rather than `foo/bar`. Domain terminology in the seed data is what makes hexagonal diagrams click for viewers; generic CRUD obscures the pattern.
