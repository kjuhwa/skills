---
name: log-aggregation-data-simulation
description: Realistic multi-service log generation with weighted severity distributions, business-hour bias, and service-specific message templates.
category: workflow
triggers:
  - log aggregation data simulation
tags:
  - auto-loop
version: 1.0.0
---

# log-aggregation-data-simulation

Simulating log aggregation data requires three layers of realism that generic random data misses. First, **severity weighting**: production log streams are heavily skewed—roughly 50% DEBUG, 35% INFO, 10% WARN, 5% ERROR. The pattern uses a cascading probability check (`Math.random() < 0.05 → ERROR, < 0.15 → WARN, < 0.50 → INFO, else DEBUG`) rather than uniform selection, so dashboards look realistic at first render. Second, **temporal bias**: the heatmap grid multiplies error/warn rates during business hours (h > 8 && h < 20) to simulate daytime traffic spikes, producing the characteristic "hot stripe" operators actually see. Without this bias, heatmaps look uniformly warm and fail to test whether the color scale differentiates peak from off-peak.

Third, **service-aware message templates**: each severity level owns a pool of domain-specific messages (e.g., WARN: "high latency 450ms", "pool near limit 48/50", "disk usage 87%"; ERROR: "timeout after 30s", "connection refused", "null pointer ref") suffixed with a random numeric ID for uniqueness. Services are defined as named arrays (`api-gw`, `auth-svc`, `db-proxy`, `worker`, `cache` for streaming; `api-gateway`, `auth-service`, `user-service`, `payment-svc`, `notification`, `scheduler`, `analytics`, `cache-layer` for grid/topology) reflecting real microservice inventories. The topology variant adds per-node aggregate stats (`errors`, `warns`, `infos`, `total`, `rate`) and a small recent-log buffer (8 entries) so the detail sidebar has data on first click.

The reusable scaffold is: define a `genLog()` factory that picks level by weighted probability, picks service uniformly, formats a timestamp via `new Date().toISOString().substr(11,12)`, and selects a message from the level-specific template pool. Accumulate into a capped circular buffer (`if (logs.length > N) logs.shift()`) and feed downstream renderers on a `setInterval` cadence (200–300ms for streaming, one-shot for static grids). For matrix views, pre-generate the full `SERVICES × HOURS` grid in a single loop, injecting the temporal bias factor at generation time so the data is ready before the first paint.
