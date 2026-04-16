---
name: canary-release-data-simulation
description: Synthetic metric generation with traffic-percentage-aware degradation curves for canary release scenarios.
category: workflow
triggers:
  - canary release data simulation
tags:
  - auto-loop
version: 1.0.0
---

# canary-release-data-simulation

The data simulation pattern generates realistic canary metrics by coupling random noise to the current traffic-split percentage. Error rates for the stable cohort stay in a narrow band (e.g., `rand(0.1, 0.4)`), while canary error rates widen inversely with traffic share—at low canary percentages the range is broad and elevated (`rand(0.1, 1.5)`), narrowing toward stable levels as the canary absorbs more traffic (`rand(0.1, 0.5)` above 50%). Latency follows the same shape: stable holds at `rand(40, 70)ms` while canary ranges from `rand(50, 140)ms` down to `rand(45, 80)ms` as confidence grows. This models the real-world pattern where early canary traffic—serving a small, potentially skewed sample—exhibits higher variance that converges as the sample size grows with traffic share.

The timeline simulator uses a phased progression array where each phase object carries a name, target traffic percentage, and duration in seconds. A tick function increments elapsed time and advances through phases sequentially, logging completion events. This discrete-phase model mirrors real deployment pipelines (Argo Rollouts, Flagger) where each step has a bake time before promotion. The fleet simulator takes a different approach: a 10×10 node grid where `promoteRandom(count)` selects random stable nodes and flips them to canary, with click-based infection spreading to neighbours within a 1.6× gap radius. This spatial model demonstrates how rolling updates propagate across a physical or logical server topology.

Both simulation styles share a common reset-and-replay pattern: a reset button clears all timers (`clearInterval`), zeroes counters, restores initial state, and re-renders. The auto-roll mode uses a fast interval (600ms–1000ms) with a terminal condition check (all nodes canary, or final phase reached) that self-cancels. This makes demos reproducible and allows rapid iteration when tuning degradation curves or phase durations for presentations and training.
