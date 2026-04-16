---
name: health-check-implementation-pitfall
description: Common failure modes in health-check dashboards — stale state, uncorrelated failures, and missing timeout detection
category: pitfall
tags:
  - health
  - auto-loop
---

# health-check-implementation-pitfall

The most dangerous pitfall across all three apps is the absence of staleness detection. If the `setInterval` or `requestAnimationFrame` loop stops (tab backgrounded, JS error, thread blocked), the UI freezes showing the last known state — which is likely "healthy." Operators see a green dashboard and assume everything is fine when in reality the monitor itself is dead. Production health dashboards must include a "last updated" timestamp with a visible age indicator, and ideally a watchdog that turns the entire UI into an error state if no refresh has occurred within 2-3x the expected interval. The Matrix app is especially vulnerable: its 3-second interval means a stalled loop goes unnoticed for minutes.

A second pitfall is uncorrelated failure simulation. All three apps generate each service's status independently, but real infrastructure has cascading dependencies — when the database goes down, Auth, Billing, and Search typically follow. The Pulse app's service list includes `Database: degraded` while `Auth: up`, which is architecturally implausible if Auth depends on the database. Health-check simulators should model a dependency graph where a parent failure propagates degradation to children with some probability, otherwise the visualization trains operators to expect independent failures and miss cascading outage patterns. The Orbit app's two-ring topology (core vs. edge) hints at this hierarchy but doesn't enforce it in the data layer.

A third pitfall is hardcoded health thresholds. The color-to-status mapping (e.g., `health > 80 = green`, probability splits of 75/17/8) is baked into JavaScript constants with no configuration surface. In production, different services have different SLAs — a 95% healthy cache is a crisis, while 95% healthy batch analytics might be acceptable. Health thresholds should be per-service configuration, not global constants, and the visualization should support SLA-relative coloring where the same percentage renders as green for one service and amber for another.
