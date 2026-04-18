---

name: strangler-fig-data-simulation
description: Synthetic endpoint/route inventory with migration-state machine and traffic-split fixtures for strangler-fig demos
category: workflow
triggers:
  - strangler fig data simulation
tags: [workflow, strangler, fig, data, simulation, migration]
version: 1.0.0
---

# strangler-fig-data-simulation

Strangler-fig simulations need a seed dataset of **endpoints/routes/features** (20–50 items is the sweet spot) where each item carries: `id`, `path`, `legacyHandler`, `newHandler` (nullable until implemented), `state` (enum: `legacy`, `shadowing`, `canary:N%`, `migrated`, `retired`), `dependencies[]` (other endpoint ids that must migrate first), `trafficVolume`, and `riskScore`. Generate traffic as a Poisson stream per endpoint so the router can compute live split ratios without hardcoded numbers.

Drive state transitions through a **strangler state machine**: `legacy → shadowing → canary → migrated → retired`, with backward edges allowed only from `canary → shadowing` (rollback). Each tick of the simulation clock advances a configurable subset of endpoints, respecting dependency order (topological sort) — this is what makes the vine "grow" deterministically rather than randomly. Seed the RNG so replays are reproducible across sessions.

Provide preset scenarios: **"happy path"** (all endpoints migrate cleanly), **"rollback storm"** (30% of canaries fail and revert), **"dependency deadlock"** (cyclic deps expose missing planning), and **"big-bang-trap"** (user tries to migrate everything at once — simulation exposes cascading failures). These presets double as teaching artifacts and as regression fixtures for the routing/visualization layer.
