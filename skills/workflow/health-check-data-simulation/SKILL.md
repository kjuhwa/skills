---

name: health-check-data-simulation
description: Generate realistic health-check sample streams with correlated failures, flapping, and recovery curves for demos and tests
category: workflow
triggers:
  - health check data simulation
tags: [workflow, health, check, data, simulation, test]
version: 1.0.0
---

# health-check-data-simulation

Real health-check data has structure that random booleans don't capture: failures cluster (a downed load balancer takes 5 dependent services with it), flapping is bursty (a service near a memory limit oscillates up/down every few probes before dying for good), and recovery is rarely instant (latency stays elevated for minutes after a restart). Simulate by modeling each probe as a small state machine with states `healthy → degrading → down → recovering → healthy` and per-state dwell-time distributions, then couple probes via a dependency graph so an upstream `down` biases downstream transitions toward `degrading`.

Seed each scenario deterministically (scenario name → PRNG seed) so a demo labelled "cascading-db-failure" produces the same sequence every run — reviewers and tests need reproducibility. Inject three canonical scenarios every health-check demo should ship with: **steady-state green** (baseline, no failures), **single-probe flap** (isolates UI behavior on oscillation), and **cascading outage** (exercises the aggregate banner and dependency visualization). Latency values should be drawn from a log-normal distribution, not uniform — real p99 tails are what stress the layout.

Tick the simulator at a rate decoupled from wall-clock (e.g. 10 simulated probes per real second for demos, 1:1 for tests) and emit each sample through the same ingestion path the real probes use. If the sim bypasses the ingestion pipeline, the UI is effectively untested.
