---
name: blue-green-deploy-implementation-pitfall
description: Common pitfalls in blue-green deploy UIs — state desync during traffic shifts, missing rollback guards, and timeline data that hides failure patterns.
category: pitfall
tags:
  - blue
  - auto-loop
---

# blue-green-deploy-implementation-pitfall

The most dangerous pitfall is **state desync during the traffic shift window**. In the simulator, the `deploying` boolean prevents concurrent deploys, but the traffic animation runs on a `setInterval` that mutates `active`, `ver`, and DOM state across multiple ticks. If the user triggers a rollback while the interval is mid-flight (e.g., at 60% shifted), the rollback handler sets `active` to the previous environment and snaps traffic bars to 100%/0%, but the still-running interval will continue incrementing and overwrite those values on its next tick. The fix requires clearing the interval reference on rollback — the current code only clears it on completion. In production, this maps to a real risk: initiating a rollback while a load-balancer is mid-rebalance can leave traffic in a split-brain state where neither the old nor new configuration is fully applied.

A second pitfall is **rollback to an unknown state**. The simulator allows rollback by simply flipping the `active` flag, but it doesn't verify that the standby environment is actually healthy or even running a known-good version. After two successive deploys, the "rollback" target is the environment that was most recently deployed to — not necessarily the last stable version. The version display even shows `v${ver-1}` as a naive decrement, which is wrong if multiple deploys occurred. In real systems, rollback must target a specific verified-good artifact, not just "the other color."

A third pitfall lives in the timeline: **weighted random status generation masks temporal patterns**. Real deploy failures cluster — a bad config change causes 3 consecutive failures, or a flaky health check causes rolled-back deploys to spike on Fridays. The uniform `Math.random()` distribution produces evenly scattered failures that look nothing like production incident patterns. For realistic simulation, failures should be generated in bursts (e.g., a "bad period" state machine that enters failure mode for 2-4 consecutive deploys with 10% probability, then recovers). Without this, operators practicing with the timeline will develop false intuition about what deploy failure patterns look like.
