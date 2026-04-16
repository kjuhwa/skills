---
name: hexagonal-architecture-data-simulation
description: Simulated domain modules, port/adapter registries, and dependency-graph data structures for hexagonal architecture demos.
category: workflow
triggers:
  - hexagonal architecture data simulation
tags:
  - auto-loop
version: 1.0.0
---

# hexagonal-architecture-data-simulation

The data layer across all three apps encodes hexagonal architecture topology as flat JavaScript arrays of plain objects — no classes, no frameworks. The Layer Explorer defines a `layers` array where each entry carries `{ r, color, label, desc, items }`, with `r` as the hexagonal ring radius and `items` listing concrete examples (entities, ports, adapters, infrastructure tools). This structure maps directly to the hexagonal rings: index 0 is always the Domain Model, index 1 is Application Services, index 2 is Adapters, and index 3 is Infrastructure. The ring radius doubles as both the rendering parameter and the hit-test boundary, keeping data and view tightly coupled for simplicity.

The Dependency Flow app introduces a richer graph model: a `modules` array where each node has `{ id, label, ring, slot, color, deps }`. The `ring` property (0 = domain, 1 = application, 2 = adapter) determines radial position, `slot` determines angular position within that ring, and `deps` is an array of other module IDs representing allowed inward-pointing dependencies. Node positions are computed once on init via `cx + ringRadii[ring] * cos(2π * slot / count - π/2)`. This structure naturally enforces the Dependency Rule: every `deps` entry must reference a module with a lower or equal `ring` value. The Config/DI node at ring 2 demonstrates the composition root pattern — it depends on nearly everything because it wires adapters to ports at startup.

The Port & Adapter Simulator models I/O channels as a `ports` array with `{ label, angle, type: 'in'|'out' }`. Inbound ports (HTTP, CLI, MQ) cluster on the left hemisphere; outbound ports (DB, API, Event) cluster on the right. The `sendMessage` function simulates request flow by selecting a source port, animating a dot to center, then routing a response to an outbound port chosen by `id % 3` round-robin. This in/out port partitioning with animated token flow is the minimal data structure needed to demonstrate how external actors interact with the domain through typed port interfaces without the domain knowing which adapter fulfills the contract.
