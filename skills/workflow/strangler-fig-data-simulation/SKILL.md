---
name: strangler-fig-data-simulation
description: Incremental module-by-module migration simulation with route-weighted traffic splitting, rollback probability, and dependency-graph decay modeling.
category: workflow
triggers:
  - strangler fig data simulation
tags:
  - auto-loop
version: 1.0.0
---

# strangler-fig-data-simulation

The strangler-fig data simulation models a phased migration from a monolithic legacy system to a set of replacement services. The simulation maintains a dependency graph of legacy modules (typically 8–20 nodes) with weighted inbound call edges. Each simulation tick represents a sprint. On each tick, the migration planner selects the leaf module with the fewest inbound dependencies (the "safest cut") and begins routing a configurable percentage of its traffic to the modern replacement — starting at 10%, ramping through 25%, 50%, 90%, then 100% over successive ticks. A rollback probability function fires per-route per-tick: P(rollback) = base_rate × (1 + error_spike / threshold), where error_spike is sampled from a log-normal distribution scaled to the module's complexity score. When a rollback triggers, the route reverts to the previous percentage tier and a cooldown counter prevents re-advancement for N ticks, simulating real-world stabilization periods.

Traffic volume per route is drawn from a Poisson process with a per-module lambda derived from historical call counts. Latency for legacy calls uses a gamma distribution (shape=2, scale=module_age_ms/2) while modern service latency uses a tighter distribution (shape=4, scale=target_p50) that improves over ticks as the team optimizes. The simulation emits per-tick snapshots containing: global legacy-vs-modern traffic share, per-route percentage, accumulated error budget burn, dependency graph with remaining edge count, and a "migration velocity" metric (modules fully cut over per N ticks). These snapshots feed directly into the visualization pattern above or can be exported as newline-delimited JSON for offline analysis.

The dependency decay model is critical: when a legacy module reaches 100% modern routing, all its outbound dependency edges are removed from the graph, potentially unlocking previously blocked modules (those with high inbound counts that now drop). This cascade effect is the simulation's most valuable insight — it reveals tipping points where migration accelerates non-linearly, matching the real-world observation that the first 60% of a strangler-fig migration is slow and the last 40% is fast once core dependencies are severed.
