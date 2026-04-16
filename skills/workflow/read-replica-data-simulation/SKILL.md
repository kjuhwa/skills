---
name: read-replica-data-simulation
description: Simulates WAL replication lag with brownian drift, regional base offsets with sine-wave seasonality, and weighted/round-robin/least-conn request routing.
category: workflow
triggers:
  - read replica data simulation
tags:
  - auto-loop
version: 1.0.0
---

# read-replica-data-simulation

Replication lag is modeled as a bounded random walk: `lag = max(0, lag + (random() - 0.55) * 20)`. The 0.55 bias nudges lag downward over time, preventing runaway drift while still producing realistic spikes. This per-replica brownian model is emitted every 40 animation frames alongside WAL packets that visually travel from primary to each replica. Reader apps pick a random replica per tick, incrementing that replica's QPS counter — a simplification that approximates uncoordinated client routing.

The lag monitor adds geographic realism by assigning each replica a base latency that increases with distance (5 ms, 13 ms, 21 ms, 29 ms — 8 ms increments per region). Each tick layers three components: the regional base, a uniform random jitter `(random() - 0.4) * 30` (biased slightly high to simulate real-world asymmetric lag), and a sine-wave term `sin(now/2000 + i) * 10` that introduces per-replica phase-shifted seasonality mimicking periodic replication batch cycles. History is kept in a 60-point rolling buffer (one point per second), pruned with `shift()`.

Request routing simulation drives traffic every 300–500 ms with three selectable strategies. Round Robin cycles a shared index mod replica count. Least Connections tracks an active `conns` counter per replica, incremented on send and decremented after a random 800–2000 ms hold time via `setTimeout`, then selects the replica with the minimum value. Weighted selection builds a cumulative distribution from integer weights (e.g., 3:2:1:2) and walks it with a random draw — this naturally skews traffic proportionally without sorting. All three share the same `pick() → index` interface, making strategy hot-swap a single assignment.
