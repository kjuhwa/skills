---
name: chaos-engineering-data-simulation
description: Stochastic fault injection and cascading failure simulation patterns for chaos engineering dashboards without real infrastructure.
category: workflow
triggers:
  - chaos engineering data simulation
tags:
  - auto-loop
version: 1.0.0
---

# chaos-engineering-data-simulation

The core simulation pattern models services as stateful objects with baseline metrics (latency, error count, requests-per-minute) and a discrete state machine (healthy → degraded → down). The blast radius app demonstrates cascade propagation: when a node is killed, its adjacency list is walked with a depth-limited BFS (max depth 3), where depth < 2 produces degradation and depth ≥ 2 produces failure. Each depth level adds a 300ms delay, making cascade timing proportional to topological distance. The key insight is that already-degraded nodes encountering a second wave of failure are promoted to "down" — this two-hit escalation rule prevents unrealistic scenarios where every neighbor instantly dies while still showing how compound failures accumulate.

The monkey dashboard uses a weighted random action selector on each tick (1.2s interval): 30% chance of latency spike (100-500ms injection), 25% chance of error burst (5-30 errors), 15% chance of traffic throttle (70% RPM drop), and 30% chance of recovery (latency/error reduction). This asymmetric distribution means the system degrades faster than it recovers, which matches real-world failure dynamics where breaking is instant but healing requires convergence. Threshold-based classification (errors > 20 = fail, > 5 = warn; latency > 200ms = fail, > 80ms = warn) converts continuous metrics into the discrete three-state model for display. Recovery is partial (random subtraction, clamped to zero), not instant reset — this prevents the dashboard from flip-flopping unrealistically.

The gameday timeline takes a different approach: a pre-scripted event sequence with absolute timestamps, played back at accelerated speed (600ms per simulated second). Events are typed into four phases — inject, observe, recover, verify — following the scientific method of chaos engineering. The scripted approach is deliberate: gameday exercises have known runbooks, so the simulation models the planned experiment structure rather than random failure. The hypothesis-first pattern ("Order service handles DB failover within 5s SLA") followed by a measured outcome ("failover took 12s — ACTION REQUIRED") encodes the key chaos engineering workflow of hypothesis → experiment → measurement → verdict.
