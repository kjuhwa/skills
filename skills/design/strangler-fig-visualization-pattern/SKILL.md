---
name: strangler-fig-visualization-pattern
description: Side-by-side legacy/modern panels with a routing seam that visualizes migrated endpoints turning green over time
category: design
triggers:
  - strangler fig visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# strangler-fig-visualization-pattern

For strangler-fig visualizations, split the canvas into three horizontal zones: a legacy monolith panel on the left (rendered as a single large block with internal endpoint nodes), a facade/router seam in the middle (a vertical bar showing per-route decision state), and the modern microservices panel on the right (rendered as discrete service cards that "grow" as routes migrate). Each endpoint node carries a migration-state color: gray (legacy-only), amber (dual-write/shadow), green (fully migrated), red (rolled back). The seam should animate request arrows flowing left or right based on the current route decision, with arrow thickness proportional to traffic percentage.

Use a growth-ring metaphor for the modern side — new services sprout from the seam and expand outward as they absorb more endpoints, visually inverting the shrinking legacy block. A persistent migration-progress bar at the top should show (migrated endpoints / total endpoints) with a secondary bar for (traffic % on modern / 100%). Avoid animating every request; sample at 10-20% and batch into flow pulses to keep the canvas readable when traffic is high.

Include a timeline scrubber below the canvas so users can replay migration state at any point — strangler-fig's value is the gradual transition, and a static snapshot loses that narrative. The scrubber should snap to migration events (route cutover, rollback, dual-write enabled) rather than uniform time steps.
