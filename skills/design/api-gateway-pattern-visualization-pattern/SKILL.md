---
name: api-gateway-pattern-visualization-pattern
description: Visualize API gateway request flow with route matching, policy evaluation chain, and upstream fan-out in a single synchronized canvas
category: design
triggers:
  - api gateway pattern visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# api-gateway-pattern-visualization-pattern

For api-gateway-pattern apps, render three horizontal lanes that share a time axis: (1) client/ingress lane with inbound request tokens colored by route match (exact, prefix, regex), (2) gateway core lane showing the policy pipeline as stacked stages (auth → rate-limit → transform → circuit-breaker → retry) where each stage pulses on evaluation and turns red on reject, and (3) upstream lane showing backend services as swim lanes with per-service latency bars and health dots. A request token animates left-to-right, branching into parallel tokens when the gateway performs scatter/gather or shadow traffic, and merging back at response aggregation. Draw the route table as a side panel with the currently matched row highlighted so viewers can tie behavior to configuration.

Overlay live metrics as slim sparklines anchored to each stage: p50/p99 latency added by the stage, reject-rate, and queue depth. Color policy decisions consistently across the app — green=allow, amber=throttle, red=deny, blue=rewrite — and always show the rejection reason as a label on the dropped token rather than silently removing it, so users see *why* traffic was cut. For circuit breakers, animate the state ring (closed/half-open/open) around the upstream node; for retries, draw ghost tokens with decreasing opacity per attempt so retry storms are visually obvious.

Keep the canvas replayable: every rendered frame must be derivable from an append-only event log (request_received, policy_evaluated, upstream_dispatched, response_returned) with monotonic timestamps. This lets users scrub backward to inspect a specific 429 or 502 without re-running traffic, and makes the visualization reproducible across the three sibling apps (traffic-router, policy-lab, latency-dashboard) by swapping only the event source.
