---
name: canary-release-data-simulation
description: Generating realistic synthetic canary rollout data with divergent health signals between stable and canary cohorts
category: workflow
triggers:
  - canary release data simulation
tags:
  - auto-loop
version: 1.0.0
---

# canary-release-data-simulation

Realistic canary simulation data requires two parallel time-series streams (stable and canary) that share a common baseline but diverge on the signals that actually trigger rollbacks in production. Generate stable cohort metrics from a stationary distribution: error rate ~0.1-0.5% with small gaussian noise, latency P95 around a fixed mean with ±10% jitter, RPS following a diurnal curve. Canary cohort metrics should inherit the same diurnal shape (both versions serve the same traffic pattern) but inject one of several failure modes on a configurable schedule: slow regression (latency drifts +5% per minute), sudden error spike (error rate jumps from 0.3% → 3% after bake time 2m), memory leak (latency tail grows while P50 stays flat), or successful rollout (canary matches stable within tolerance).

The traffic split must be enforced in the generator itself: if the split is 90/10, generate exactly 10% of request events routed to canary, not 50/50 with post-hoc filtering — this preserves the statistical reality that canary cohorts have lower sample counts and therefore wider confidence intervals on health metrics. Model this explicitly by making canary error-rate variance inversely proportional to sqrt(canary_rps). Include gate-evaluation events as discrete records — each promotion check emits a record with stage, timestamp, SLO thresholds, observed values, and pass/fail — so the UI can replay the decision log. Rollback events should cascade: set canary traffic to 0 over a short drain window (30-60s), not instantaneous.

Seed the RNG deterministically so the same scenario replays identically for demo/test reproducibility, but expose scenario selection as a top-level parameter (healthy-promotion, latency-regression, error-spike, memory-leak, flaky-gate). Canary rollouts are stage-gated events — the data model should reflect that with explicit stage transitions, not a continuous percentage ramp, since real canary controllers (Flagger, Argo Rollouts) work in discrete steps.
