---
name: bff-pattern-data-simulation
description: Simulating BFF request routing, per-client latency profiles, and throughput metrics with bounded randomization.
category: workflow
triggers:
  - bff pattern data simulation
tags:
  - auto-loop
version: 1.0.0
---

# bff-pattern-data-simulation

BFF data simulation models the core routing rule: each client type maps to exactly one dedicated BFF, and each BFF fans out to a specific subset of backend microservices. The routing table is the source of truth — Mobile BFF → [Users, Orders], Web BFF → [Users, Orders, Inventory], IoT BFF → [Inventory]. Requests are generated either on user interaction (button click) or auto-triggered at staggered intervals (e.g., 600ms apart per client type). Each simulated request becomes a particle that traverses the BFF node, then spawns child particles for each downstream service call, modeling the fan-out behavior that distinguishes BFF from a simple API gateway.

For metrics simulation, each BFF instance carries a latency profile with a base value and jitter spread: `rand(base, spread)` returns `base + Math.random() * spread - spread/2`. Realistic defaults are Mobile BFF 45ms/20ms-spread at 1200 RPS, Web BFF 30ms/15ms-spread at 3400 RPS, and TV/IoT BFF 60ms/25ms-spread at 400 RPS — reflecting that lightweight mobile payloads are faster than rich web responses, while IoT has low throughput but higher per-request cost. Data is buffered in a 50-point rolling array, pre-populated with 30 ticks on initialization so charts never start empty.

The simulation deliberately avoids modeling failure states or circuit breakers in the base pattern — it focuses on the steady-state routing and latency characteristics that define BFF behavior. This keeps the simulation faithful to the pattern's purpose (client-specific API adaptation) rather than conflating it with resilience patterns. When extending, add per-BFF payload size differences (mobile: compressed/minimal fields, web: full response, IoT: binary/protobuf) to show how BFFs tailor responses beyond just routing.
