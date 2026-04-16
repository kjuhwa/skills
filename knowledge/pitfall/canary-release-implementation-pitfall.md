---
name: canary-release-implementation-pitfall
description: Common failure modes in canary deployments — sticky sessions, metric lag, blast radius miscalculation, and premature promotion.
category: pitfall
tags:
  - canary
  - auto-loop
---

# canary-release-implementation-pitfall

The most dangerous canary pitfall is **metric observation lag**: the canary receives traffic at tick T, but error metrics (especially downstream effects like database connection exhaustion or queue backlog) may not surface until T+30s or later. If the promotion check window is shorter than the metric propagation delay, the canary gets promoted while harboring a latent failure. In visualization apps this manifests as the polyline looking clean during the observation phase, then spiking after promotion when 100% traffic hits the bad code. Real systems must set observation windows at least 2–3x the longest metric pipeline delay (including aggregation intervals in Prometheus/Datadog) — a 30-second scrape interval means a minimum 90-second observation window per weight step.

**Sticky sessions and uneven sampling** break the statistical assumptions behind threshold-based rollback. If a load balancer uses cookie-based affinity, early canary users get "stuck" on the new version — the canary's error rate reflects a small, non-representative cohort rather than a random sample of all traffic. A canary showing 0% errors with 12 sticky users tells you nothing. Correct implementations either disable session affinity during canary phases or use header-based routing (`x-canary: true`) with explicit cohort selection. The traffic-flow visualization should reflect this: if particles always follow the same path, the simulation is modeling affinity; if they randomly split, it's modeling stateless routing.

**Blast radius miscalculation** occurs when teams set the initial canary weight too high (e.g., 25%) for a service handling 10,000 RPS — that's 2,500 RPS hitting unproven code immediately. Combined with a slow rollback mechanism (DNS propagation, container drain), the damage window can be 30–60 seconds of degraded service for a quarter of all users. Safe practice is starting at 1–5% weight with a fast-path rollback (instant load-balancer weight change, not a redeploy), and only increasing step size after the first observation window passes clean. The rollout-sim's threshold animation makes this visceral: watching 25% of particles turn red for 45 seconds before rollback completes demonstrates why small initial weights matter far more than any documentation.
