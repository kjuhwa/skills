---
name: hexagonal-architecture-data-simulation
description: Scenario-driven flow simulation through driving-adapter → port → use-case → entity → port → driven-adapter chains with step-by-step timeline instrumentation.
category: workflow
triggers:
  - hexagonal architecture data simulation
tags:
  - auto-loop
version: 1.0.0
---

# hexagonal-architecture-data-simulation

The simulation pattern models hexagonal request flows as ordered scenario objects with three segments: `driving` (adapter + port), `core` (use-case + entity), and `driven` (port + adapter). Each segment contains nodes with a `label` (structural role) and `name` (concrete implementation, e.g., "REST Controller", "PostgresAdapter"). Scenarios are selected from a dropdown and rendered into a three-column grid layout — driving side, domain core, driven side — with each node rendered as a card showing its role label and implementation name. This tripartite data structure mirrors the hexagonal dependency rule: driving adapters depend inward on ports, the domain depends on nothing external, and driven adapters implement outward-facing port interfaces.

Flow execution iterates sequentially through the concatenated `[...driving, ...core, ...driven]` node array, activating each node's DOM element with a CSS `.active` class (glowing border via `box-shadow: 0 0 12px rgba(110,231,183,0.3)`) and appending a timestamped step to a timeline log. Each step introduces a randomized delay (`80 + Math.random() * 200`ms) to simulate realistic processing latency, with a cumulative `t` counter tracking total elapsed time. The timeline renders each step with a left-border that transitions from idle (#2d333b) to complete (#6ee7b7), creating a visual pipeline effect. A `running` flag prevents concurrent executions, and node highlights are cleared after a 1200ms cooldown.

Realistic scenarios should span diverse adapter types to demonstrate port interchangeability — the hallmark of hexagonal architecture. The three reference scenarios cover REST→Postgres (synchronous CRUD), Kafka→SMTP (event-driven notification), and GraphQL→Redis (cached query), proving that the domain core remains unchanged while driving and driven adapters vary. Each scenario's data shape is intentionally uniform (`{ label, name }` pairs in three arrays) so the same rendering and execution engine handles all cases without branching. This uniform-scenario-schema pattern makes it trivial to add new flows (e.g., gRPC→MongoDB, WebSocket→S3) without modifying the simulation engine.
