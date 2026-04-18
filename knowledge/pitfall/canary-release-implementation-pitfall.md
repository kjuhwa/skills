---
version: 0.1.0-draft
name: canary-release-implementation-pitfall
description: Common traps when modeling canary releases — low-volume gate noise, symmetric SLOs, and instant weight shifts
category: pitfall
tags:
  - canary
  - auto-loop
---

# canary-release-implementation-pitfall

The biggest trap is evaluating SLO gates on the canary lane before it has accumulated statistically meaningful traffic. At 1% weight and modest request rates, the canary may see only dozens of requests during a bake window — a single 500 response swings the error rate by several percent and trips the rollback gate for no real reason. Always require a minimum sample size (e.g., ≥ 1000 canary requests or ≥ 30 errors on stable for a proper ratio test) before a gate can produce a *fail* verdict; below that, the gate should return `inconclusive` and extend the bake, not roll back.

The second trap is using symmetric thresholds on error-rate delta. Canary being 0.1% *better* than stable is not the same signal as 0.1% *worse* — but naive `abs(delta) > threshold` code treats them identically and triggers promotion hesitation on improvements. Use one-sided comparisons: rollback on `canary − stable > threshold`, promote freely when canary is equal or better. Similarly, latency deltas should be compared at matching quantiles (p99 vs p99), not means, because canary-vs-stable mean latency hides tail regressions that actually page oncall.

The third trap is animating weight shifts as instantaneous jumps. Real load balancers drain connections and honor keep-alive, so a 5%→25% shift takes seconds to minutes to materialize in request distribution. A viz that snaps the band widths instantly misleads viewers into thinking rollback is free; show a visible ramp (ease-out over a few simulated seconds) and keep "in-flight on old weight" tokens visible until they complete, so the cost of a premature promotion is felt, not just stated.
