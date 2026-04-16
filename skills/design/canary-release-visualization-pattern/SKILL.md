---
name: canary-release-visualization-pattern
description: Visualizing canary release rollouts with traffic split, version cohorts, and health signal overlays
category: design
triggers:
  - canary release visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# canary-release-visualization-pattern

A canary release visualization must simultaneously convey three orthogonal dimensions: the traffic split ratio between stable and canary versions (typically shown as a stacked bar or dual-ring gauge with percentages like 95/5, 90/10, 75/25), the cohort of requests flowing to each version (rendered as animated particle streams or request dots colored by target version), and the health signals per cohort (error rate, latency P95/P99, saturation) shown as sparkline overlays beside each version node. The canonical layout is a left-to-right pipeline: load balancer/router node → split fan-out → two parallel version lanes (stable in blue/green, canary in amber/orange) → aggregated downstream. Color semantics must be consistent: amber/yellow for canary-in-progress, green for promoted/healthy, red for rolled-back/unhealthy, gray for stable baseline.

The promotion ladder is the second critical visual element — a stepped progress indicator showing discrete stages (1% → 5% → 25% → 50% → 100%) with the current stage highlighted, elapsed bake time, and a "next gate" countdown. Each stage should display pass/fail badges for SLO gates (error budget, latency threshold, saturation). Rollback events must be visually distinct: a reverse-flowing animation or a red burst at the split node with timestamp callouts, not a silent reset. Include a version legend pinned to a corner showing stable vs canary SHA/tag, deploy time, and the human operator who triggered promotion.

Interactive affordances that differentiate good dashboards: hover a cohort lane to see per-endpoint breakdown, click a stage gate to inspect which SLO tripped, scrub a timeline to replay the rollout. Avoid showing raw Kubernetes pod counts front-and-center — operators think in traffic percentages and health signals, not replica counts. Reserve pod/replica detail for a secondary drill-down panel.
