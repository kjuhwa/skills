---
name: sidecar-proxy-data-simulation
description: Procedural generation of mesh topology, request-pipeline traffic, and time-series proxy metrics with multi-mode fault injection.
category: workflow
triggers:
  - sidecar proxy data simulation
tags:
  - auto-loop
version: 1.0.0
---

# sidecar-proxy-data-simulation

The topology simulator defines a service registry (API Gateway, User, Order, Payment, Inventory) with an edge list encoding allowed communication paths. Particles are spawned every 400 ms on a random edge with a constant speed, removed when they reach the destination. This produces a stochastic visual load proportional to the number of active edges a service participates in, approximating real mesh fan-out without needing actual traffic data. Selecting a node filters the particle set to highlight only that service's inbound and outbound flows.

The traffic-pipeline simulator operates in three modes — normal (steady request generation every 300 ms), spike (4× burst rate at 75 ms intervals), and fault (40 % of requests injected with elevated latency, status 429/503, and reduced traversal speed). Each request object carries progress (0–1), speed multiplier, fault flag, latency, HTTP status, current stage index, and a logged flag. Latency is drawn from a base of 20–80 ms for healthy requests and 200–500 ms for faults. The access log is capped at 200 FIFO entries and tagged with a random HTTP method and API path from predefined pools.

The dashboard simulator maintains two 60-point rolling arrays (latency and RPS) updated every 1.5 s with Gaussian-like jitter (±20 % of a center value). KPI cards are derived from the latest array tail. The service status table assigns each service a weighted random state — 80 % HEALTHY, 15 % DEGRADED, 5 % UNHEALTHY — with correlated connection counts (150–500), P99 latency (50–200 ms), and error rates (0.1–5 %). This layered approach produces dashboards that feel alive without any backend.
