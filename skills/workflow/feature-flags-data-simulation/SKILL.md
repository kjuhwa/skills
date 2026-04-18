---

name: feature-flags-data-simulation
description: Synthetic data generation for feature-flag rollouts, dependencies, and experiments
category: workflow
triggers:
  - feature flags data simulation
tags: [workflow, feature, flags, data, simulation, synthetic]
version: 1.0.0
---

# feature-flags-data-simulation

Generate feature-flag fixture data as three coupled streams from one seed: (1) a flag registry (key, type ∈ {boolean, multivariate, kill-switch}, owner, environment), (2) an evaluation event stream (userId, flagKey, variant, timestamp, reason ∈ {rule_match, percentage_bucket, default, override}), and (3) a rollout timeline (flagKey, t, targetPercentage, actualPercentage). Derive conversion/experiment metrics from the evaluation stream rather than generating them independently — otherwise exposure counts and conversion rates drift apart and the A/B math becomes nonsensical.

For percentage rollouts, simulate bucketing with a stable hash of `userId + flagKey` so the same user consistently gets the same variant across the replay — naive `Math.random()` per evaluation produces visually correct percentages but breaks the "sticky assignment" invariant users expect. For dependency graphs, generate parents first and seed children only with parent states already ON for at least N evaluations, so the graph shows realistic "enabled-in-order" cascades instead of impossible configurations where a child is ON while its parent is OFF.

Bias the synthetic distributions to produce the edge cases operators actually debug: ~5% of flags in PARTIAL state (rollout in progress), 1–2 cyclic dependencies, one kill-switch currently tripped, one experiment with sample size too small for significance, and one "zombie" flag (100% ON for >90 days — a refactor candidate). A fixture that only shows happy-path flags makes the UI look done but teaches nothing about the failure modes the product exists to surface.
