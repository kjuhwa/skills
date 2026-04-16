---
name: load-balancer-data-simulation
description: Simulation patterns for generating realistic load-balancer traffic, algorithm selection, and node health metrics without backend infrastructure.
category: workflow
triggers:
  - load balancer data simulation
tags:
  - auto-loop
version: 1.0.0
---

# load-balancer-data-simulation

Traffic simulation for load balancers requires three layers: request generation, algorithm-based routing, and per-server state tracking. Requests are generated on a fixed interval (e.g., 900ms for steady flow) with a burst mode that multiplies the count (×10) to stress-test distribution. Each request is routed through a `getTarget(algorithm)` dispatcher that implements round-robin (modular counter incremented per request), least-connections (scan all servers, pick the one with the lowest active count, decrement after a simulated response delay), and weighted-random (cumulative weight array with `Math.random() * totalWeight` binary lookup, where weights like [3,2,2,1,1] model heterogeneous server capacities). Maintaining a `connections[]` array per server and decrementing on a timeout (e.g., 800–1500ms) is critical for least-connections to behave realistically—without the decrement, it degrades to round-robin.

For health-metric simulation, each node maintains a state object with CPU, memory, RPS, latency, and error rate. On each tick, values are updated with a bounded random walk: `value += (Math.random() - 0.5) * jitter`, clamped to domain-specific ranges (CPU 5–99%, memory 10–99%, latency 10–500ms). RPS is modeled per-node with different base rates to reflect region-specific traffic patterns (e.g., us-east nodes handle 800–1200 RPS while ap-south handles 200–400). Status transitions use hysteresis thresholds on CPU: a node goes "down" above 95% and "degraded" above 85%, but doesn't recover until dropping below the threshold, preventing status flicker. Error rate spikes are correlated with high CPU—when CPU exceeds 90%, error rate jitter doubles, simulating real overload behavior.

The algorithm-race simulation distributes a fixed budget of requests (e.g., 200) across N servers in synchronized steps, recording per-algorithm distributions. Variance (σ² = Σ(count - mean)² / N) is computed after each step as the primary fairness metric. This reveals that round-robin achieves near-zero variance, least-connections converges quickly but shows transient imbalance, and weighted-random matches its target distribution only at high request counts. Running the race multiple times and averaging variance gives a statistically robust comparison. This fixed-budget, step-synchronized, variance-scored pattern is the canonical way to benchmark any request-distribution strategy.
