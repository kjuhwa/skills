---
name: load-balancer-data-simulation
description: Deterministic request/server simulation loop for driving load balancer demos without real traffic
category: workflow
triggers:
  - load balancer data simulation
tags:
  - auto-loop
version: 1.0.0
---

# load-balancer-data-simulation

Drive the simulation with a fixed-tick scheduler (e.g., 100ms ticks via `setInterval` or `requestAnimationFrame` accumulator) that emits synthetic requests at a configurable rate (req/sec) with optional Poisson jitter. Each request carries `{id, clientIp, sizeKb, cpuCost, arrivalTime}`. Seed randomness via a PRNG (e.g., mulberry32) initialized from a user-visible seed input so scenarios are reproducible across reloads and across the three apps — critical when users want to re-run the same burst to compare algorithm behavior.

Model backend servers as state machines with three knobs: `capacity` (max concurrent), `processingMs` (base latency), and `failureRate` (probability of 5xx). On each tick, advance in-flight requests by the tick delta, decrement remaining work, and release the connection slot when done. Inject scripted failure scenarios — flap a server's health every 3s, spike one server's CPU to 95%, or kill a server mid-burst — to exercise health-check-dashboard's detection logic and force LB re-routing.

Expose a scenario registry: `lightLoad`, `burstTraffic`, `hotspotClient` (same IP hammering for IP-hash demo), `cascadingFailure`, `weightedMismatch`. Each scenario is a declarative config `{durationMs, rps, serverOverrides, failureScript}` so the same simulator core powers all three apps with just a scenario swap.
