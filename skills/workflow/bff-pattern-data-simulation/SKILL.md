---
name: bff-pattern-data-simulation
description: Generate realistic BFF traffic by simulating per-client request shapes, parallel backend fan-out with varied latency, and client-specific response trimming
category: workflow
triggers:
  - bff pattern data simulation
tags:
  - auto-loop
version: 1.0.0
---

# bff-pattern-data-simulation

Seed the simulator with a client registry (web, mobile, iot, smart-tv) where each client declares its own field projection, page size, and acceptable payload budget — e.g., mobile requests 10 items with 6 fields each while web requests 50 items with 20 fields. Generate synthetic backend services (user-svc, product-svc, cart-svc, inventory-svc, recommendation-svc) each with their own latency distribution (log-normal, p50/p95/p99) and payload size distribution. A single inbound client request should deterministically map to a fan-out plan: which backends to call, in what order (parallel groups vs. sequential chains where one response feeds the next), and which fields to project on return.

Drive the clock with a discrete event queue rather than real sleeps so you can replay and compare scenarios. Each tick emits: client request in, BFF schedules N backend calls, each backend call gets a sampled latency + sampled payload, BFF collects responses (blocking on the slowest parallel call), applies the per-client projection/trim, then emits the outbound response event. Record six fields per simulated request: client type, fan-out count, parallel-group depth, tail latency, backend bytes total, client bytes out. This dataset is what the visualization layer consumes — keep it as a flat JSONL stream so replay and filtering stay cheap.

Include three failure-mode toggles in the simulator because they're the interesting cases: (1) one backend degrading (latency spike or error rate) to see how it drags the BFF tail, (2) payload bloat on a backend to test whether the BFF projection still keeps client bytes bounded, (3) partial-failure tolerance where the BFF returns a degraded response omitting one backend's data. Emit a per-request `degraded_fields` array so downstream visualizations can render partial responses with ghost/dimmed cells rather than hiding the failure.
