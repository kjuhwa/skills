---
name: load-balancer-implementation-pitfall
description: Common pitfalls in load balancer simulations — biased randomness, stale routing state, and misleading fairness metrics.
category: pitfall
tags:
  - load
  - auto-loop
---

# load-balancer-implementation-pitfall

The weighted-random implementation in the algorithm-race app contains a subtle bug: the weight accumulation uses `weights.reduce((a, b) => a + Math.max(a, b + 1), 1)` instead of a simple sum, which distorts the probability distribution. The `Math.max(a, b + 1)` causes the total to grow non-linearly, meaning servers with low remaining capacity don't get proportionally less traffic — they get near-zero traffic while the first server in array order is over-favored. In production load balancers, this class of bug (incorrect weight normalization) silently concentrates traffic on a subset of servers. The fix is straightforward (`weights.reduce((a, b) => a + b, 0)` with `Math.max(0, weight)` per server), but the symptom — slightly uneven distribution — is easy to dismiss as "randomness" unless you measure StdDev rigorously.

A second pitfall is the simulator's connection-drain model: `setTimeout(() => { server.load-- }, 1500)` uses a fixed delay, but real servers have variable response times. Under burst conditions, all 10 requests pick their servers based on the *pre-burst* load state (because `pickServer` reads current load, but load only decrements 1.5s later). This means the least-connections algorithm makes 10 decisions against the same stale snapshot — it will route all 10 requests to the same lowest-loaded server, creating a thundering-herd effect that the simulation accurately demonstrates but doesn't warn about. Any load-balancer simulation that uses synchronous dispatch with deferred drain will exhibit this artifact; add jitter to drain times (`1000 + Math.random() * 1000`) and re-read load state per-request to model real behavior.

A third common pitfall is evaluating algorithms with homogeneous servers. The simulator uses four servers with different `maxLoad` values (10, 8, 12, 6), which correctly exposes that round-robin ignores capacity, but the health dashboard uses six nodes with identical initial structures — hiding the fact that least-connections performs poorly when servers have wildly different processing speeds. When benchmarking algorithms, always test with at least a 3:1 capacity ratio between the strongest and weakest server, and include at least one degraded node (health < 80%) to surface routing pathologies that uniform setups conceal.
