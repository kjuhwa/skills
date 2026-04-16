---
name: canary-release-data-simulation
description: Tick-based probabilistic generators for canary traffic splits, error-rate drift, latency distributions, and rollback triggers.
category: workflow
triggers:
  - canary release data simulation
tags:
  - auto-loop
version: 1.0.0
---

# canary-release-data-simulation

The traffic-split simulation maintains a `weightCanary` float (0.0–1.0) that increments by a configurable step (e.g., 0.05) on each promotion tick. Every request tick generates a random `Math.random() < weightCanary` decision to route to canary or stable. Each backend maintains independent error-rate and latency generators: stable uses a low baseline (error 0.1%, p99 80ms) with Gaussian noise, while canary starts at a similar baseline but accepts an injected "fault scenario" — a sigmoid drift that gradually increases error rate after N ticks, simulating a regression that only manifests under sustained load. This two-pool model lets the visualization show divergence between versions organically rather than flipping instantly.

Rollback logic evaluates a sliding window (last 30 ticks) of canary metrics against configurable thresholds: error rate > 2%, p99 latency > 300ms, or success rate < 97%. When any threshold is breached for 3 consecutive evaluation windows, the simulation emits a `rollback` event that snaps `weightCanary` back to 0.0 and marks the timeline phase as failed. Promotion fires when the canary survives the full observation period (e.g., 100 ticks at each weight step) without breaching thresholds — the weight advances to the next step, or if already at 1.0, emits a `promoted` event. This window-based evaluation avoids reacting to single-tick noise spikes while still catching sustained regressions.

Scenario presets bundle realistic failure modes: "slow memory leak" applies a linear latency ramp starting at tick 60; "bad config" injects a step-function error spike at tick 20 with 8% error rate; "healthy release" keeps canary metrics within ±5% of stable for the full run. Each preset seeds the pseudo-random generator deterministically so the same scenario replays identically — critical for demos and screenshot-based documentation. The tick interval is user-adjustable (50ms–1000ms) to support both real-time watching and fast-forward analysis.
