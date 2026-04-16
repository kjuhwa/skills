---
name: chaos-engineering-data-simulation
description: Generate synthetic chaos experiment data including failure propagation, resilience scoring, and gameday event timelines for testing and demos.
category: workflow
triggers:
  - chaos engineering data simulation
tags:
  - auto-loop
version: 1.0.0
---

# chaos-engineering-data-simulation

All three chaos apps synthesize realistic data without a live backend, following a pattern that can be extracted into a reusable simulation layer. The blast-radius simulator models failure propagation as a BFS walk over a service dependency graph: the origin node is set to "failed", then each neighbor is visited with a probability split (60/40 failed vs. degraded), producing a wavefront that mirrors real cascading failures in microservice topologies. The adjacency list ([0,1],[0,2],...) encodes actual microservice call patterns — API gateway fans out to auth/orders/catalog, orders depend on cache and payments, payments fan out to notify and shipping — so the simulation produces plausible blast patterns rather than random noise.

The resilience matrix generates a service×failure-type cross product where each cell has a boolean `tested` flag, a normalized `score` (0-1 uniform random), and an `mttr` value (10-310 seconds uniform). This models a real chaos testing coverage matrix where some combinations are untested, and tested ones range from resilient to vulnerable. The gameday board generates timeline events by attaching 2-4 actions (alert fired, auto-scaled, circuit breaker opened, rollback triggered, recovery confirmed) to each experiment at 45-second intervals, sorted chronologically. The error-rate metric uses a 30-point time series with a regime change at point 18 — low noise (0-45) before injection, elevated noise (35-75) after — simulating the step-function degradation pattern seen in real chaos experiments.

To make this simulation layer reusable, parameterize three generators: (1) a graph propagation engine that accepts an adjacency list, origin node, and per-hop failure probability; (2) a matrix populator that accepts service/failure-type lists and configurable score distributions with an untested ratio (here 40%); (3) a timeline synthesizer that takes experiment metadata and produces event streams with configurable action vocabularies and interval spacing. Each generator should return plain data objects, keeping rendering concerns separate so the same simulation can drive unit tests, Storybook stories, or live demo environments.
