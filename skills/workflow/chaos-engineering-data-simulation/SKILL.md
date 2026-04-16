---
name: chaos-engineering-data-simulation
description: Generating realistic fault-injection scenarios, blast radii, and recovery curves without a real cluster
category: workflow
triggers:
  - chaos engineering data simulation
tags:
  - auto-loop
version: 1.0.0
---

# chaos-engineering-data-simulation

Simulated chaos data must respect three invariants: (1) causality — downstream services can only degrade after their upstream dependency degrades, so generate faults as a BFS/DFS walk over a seeded dependency graph with per-edge propagation probability and latency; (2) partial failure — real chaos is rarely binary, so emit metrics as `{healthy_pct, degraded_pct, failed_pct}` triples that sum to 1, driven by a decay function from the injection epicenter; (3) recovery asymmetry — MTTR is almost always longer than time-to-degrade, so use separate curves (e.g., exponential decay for failure spread, logistic curve for recovery) rather than mirroring them.

For gameday scenario runners, seed the RNG per scenario ID so the same "latency injection on payment-svc" replays identically — reproducibility is the whole point of a tabletop exercise. For entropy-dice style apps, expose the weight vector of fault types (network partition, CPU hog, pod kill, clock skew, disk fill) as tunable config, and log every roll with its seed + weights so a surprising outcome can be re-derived. Blast radius should be computed, not hardcoded: given an injection node, walk the graph up to N hops with a probability that decays by hop distance and by per-edge resilience score.

Cap simulated chaos at realistic bounds — no experiment in a mature system takes down 100% of services, and simulating that produces UI that looks like a toy. Clip at ~60–70% failure as the upper realistic bound and let "total meltdown" be an explicit rare scenario, not the default tail.
