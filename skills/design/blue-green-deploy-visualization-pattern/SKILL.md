---
name: blue-green-deploy-visualization-pattern
description: Dual-environment visualization rendering blue/green stacks side-by-side with a traffic-weight router between them
category: design
triggers:
  - blue green deploy visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# blue-green-deploy-visualization-pattern

Blue-green deployment visualizations should render the two environments as parallel, visually symmetric panels (left=blue, right=green) with persistent color coding (blue=#1e6fd9, green=#2ea043) applied consistently to backgrounds, borders, labels, and connection lines. Between them, place a central "traffic router" element — typically a weighted splitter showing percentage allocation (e.g., 90/10, 50/50, 0/100) as both a numeric label and a proportional visual bar. Each environment panel must display version tag, instance count, health status badge, and active-request count so operators can compare at a glance.

For the traffic-shifter view, animate the cutover as a sliding weight on the router rather than instant flips — this communicates the gradual nature of progressive traffic shifting. For the timeline view, use a horizontal swimlane with blue and green rows, and overlay deployment phases (idle → staging → canary → cutover → drain → decommission) as colored segments; mark the cutover point with a vertical "switch" marker. For the health dashboard, stack blue-above-green with metric sparklines (latency, error rate, CPU) aligned on the same time axis so divergence during cutover is visually obvious.

Always include a dormant/idle state indicator — blue-green's value is that the inactive stack still exists. Grey out (reduce opacity to ~0.5) the non-serving stack rather than hiding it, so viewers understand rollback is one router-flip away.
