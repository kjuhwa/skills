---
name: health-check-implementation-pitfall
description: Common traps when building health-check dashboards: stale samples, threshold drift, and misleading aggregate status
category: pitfall
tags:
  - health
  - auto-loop
---

# health-check-implementation-pitfall

The most damaging pitfall is treating "no recent sample" as healthy. If a check agent crashes, dashboards that only render the latest received sample will keep showing green indefinitely. Always attach a `staleAfterMs` per subsystem and render missing samples as an explicit "unknown" state (typically grey, not green). Timeline views should draw gaps rather than interpolating across missing windows — interpolation hides the exact outage that operators need to see.

Threshold drift is the second trap: thresholds hardcoded in the UI diverge from thresholds used by the probing agent, so the dashboard says "warn" while the alerting pipeline says "fail" (or vice versa). Ship thresholds *with* each sample (`threshold`, `warnThreshold` fields) rather than configuring them on the frontend. This also makes the radar view honest — axes can be normalized to `value/threshold` so the healthy polygon is always the unit circle regardless of subsystem units (ms, %, count).

Third, avoid rolling every subsystem into a single green/amber/red "overall" badge using naive worst-of logic. A single noisy check (flapping SSL cert expiry warning) will pin the whole system to amber and train operators to ignore it. Instead, weight by subsystem criticality and require N consecutive failing samples before escalating aggregate status — and always make the aggregate drillable back to the specific failing check in one click across all three views.
