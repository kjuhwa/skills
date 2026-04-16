---
name: blue-green-deploy-implementation-pitfall
description: Common failure modes when implementing blue-green deployment simulators and real cutover logic.
category: pitfall
tags:
  - blue
  - auto-loop
---

# blue-green-deploy-implementation-pitfall

The most dangerous pitfall in blue-green deployment is the **missing health-check gate before traffic switch**. In the simulator codebase, the health check is a simple `setTimeout` of 1.5 seconds before switching begins — a fire-and-forget delay that always passes. Real implementations must make the traffic switch conditional on actual health-check results (HTTP 200 from `/health`, database connectivity, downstream dependency readiness). Without this gate, a broken deployment receives 100% traffic in 2 seconds. The simulator's rollback function compounds this: it snaps traffic instantly (no gradual ramp-down) and decrements the version counter without verifying the previous environment is still healthy. If the standby environment was recycled or had its deployment artifacts cleared during the forward deploy, the instant rollback lands on a dead environment.

A second pitfall is **state desynchronization between the traffic split and the environment model**. The simulator tracks active environment as a single string (`active = 'blue'`), but the traffic bars, CSS classes, version labels, arrow direction, and status text are all updated independently inside the `setInterval` completion callback. If a user clicks deploy during an in-progress switch (the `deploying` flag guards this, but only in the button handler — not in the rollback path), the fill percentages, active flag, and UI labels can diverge. In real load-balancer integrations, this maps to the control plane believing traffic is on Green while the data plane still routes to Blue — a split-brain that causes dropped requests or double-serving.

Third, the **timeline's status distribution masks deployment coupling**. Each deployment is generated independently with random status, but real blue-green failures are correlated: a failed deploy to Green often triggers a rollback, which is itself a deployment event to Blue. The simulator generates "rolled-back" and "failed" as independent events rather than linked pairs, so dashboards built on this simulated data will undercount the true blast radius of a failure (one failure should produce two timeline entries: the failed deploy and the rollback deploy). Additionally, duration is uniformly random (5–60s), but real deployments have bimodal distributions — fast successes cluster around 10–15s while failures often hit timeout ceilings at 55–60s. Simulating uniform duration trains operators to ignore a signal (long duration) that in production is a strong predictor of imminent failure.
