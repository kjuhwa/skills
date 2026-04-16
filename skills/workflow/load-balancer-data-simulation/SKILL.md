---
name: load-balancer-data-simulation
description: Strategies for generating realistic synthetic load balancer traffic, server state fluctuations, and algorithm comparison data without real infrastructure.
category: workflow
triggers:
  - load balancer data simulation
tags:
  - auto-loop
version: 1.0.0
---

# load-balancer-data-simulation

The simulator app models backend servers as objects with `load`, `maxLoad`, `name`, and fixed canvas positions. Request generation uses two modes: steady-state (`setInterval` every 2s) and user-triggered burst (10 requests staggered at 80ms intervals via `setTimeout`). Each request increments the target server's load on dispatch and decrements it after a 1500ms simulated processing delay — creating a simple connection-pool model where concurrent load accumulates realistically. The algorithm selector (`round-robin`, `least-conn`, `random`) uses a shared `pickServer()` function: round-robin tracks a monotonic `rrIndex`, least-connections does `servers.reduce((a,b) => a.load < b.load ? a : b)`, and random uses uniform `Math.floor(Math.random() * servers.length)`.

The health dashboard simulates per-node metric drift by applying bounded random walks each tick: RPS shifts by `±200 * (random - 0.48)` (slightly upward bias) clamped to minimum 100, latency shifts by `±3` clamped to minimum 3ms, and health uses discrete events — 10% chance of -5 degradation, 20% chance of +1 recovery, 70% stable. A 60-element sliding window (`history[i].push(newVal); history[i].shift()`) stores RPS history for sparkline rendering. This creates organic-looking fluctuation without needing a probabilistic distribution library.

The algorithm-race app provides the most rigorous simulation: it creates 5 servers with randomized capacity (`30 + Math.random() * 20`) and dispatches 200 requests synchronously across three algorithm lanes in lockstep. The weighted-random algorithm computes available headroom (`capacity - load`) per server as weights, then does a cumulative random selection. Fairness is scored by standard deviation of final load distribution (`Math.sqrt(servers.reduce((sum, s) => sum + (s.load - mean)^2, 0) / N)`), and the winner is the algorithm with the lowest StdDev. When building load-balancer simulations, use heterogeneous server capacities (not uniform) to expose real algorithmic trade-offs, and always include both StdDev and max-load as evaluation metrics.
