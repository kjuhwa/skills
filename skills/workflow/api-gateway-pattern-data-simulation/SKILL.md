---
name: api-gateway-pattern-data-simulation
description: Generate realistic gateway traffic with route-aware mix, policy-triggering edge cases, and upstream failure injection
category: workflow
triggers:
  - api gateway pattern data simulation
tags:
  - auto-loop
version: 1.0.0
---

# api-gateway-pattern-data-simulation

Drive api-gateway-pattern simulations from a declarative traffic profile: a list of `{route, method, weight, headerTemplate, bodySize, thinkTimeMs}` entries that a weighted sampler draws from each tick. Build the route mix so it actually exercises the gateway — include at least one route per policy class (public unauthenticated, JWT-protected, rate-limited bursty, large-payload transform, slow upstream, flaky upstream) rather than a uniform distribution, because uniform traffic hides the interesting cross-policy interactions the gateway exists to handle. Inject correlated bursts using a Poisson process with a time-varying lambda so rate-limiters and circuit breakers actually trip instead of idling flat.

Model upstreams as independent state machines with tunable latency distributions (lognormal for healthy, bimodal for degraded), error rates, and scheduled failure windows. Each simulated upstream call should sample latency, decide success/failure/timeout, and emit the same event shape a real gateway would log, so the same downstream visualization and policy engine code works against simulated and recorded production traces. Seed the RNG per scenario so "auth-storm at t=30s" or "upstream-B brownout" is bit-for-bit reproducible.

Expose three simulation knobs at the UI level: RPS multiplier, failure-injection toggle per upstream, and a policy-override slider (e.g. rate-limit threshold, retry count, circuit-breaker error %) so users can A/B the gateway's behavior live. Persist the generated event stream to the same append-only log the visualization consumes; this keeps traffic-router (what routed where), policy-lab (which policies fired), and latency-dashboard (p99 per route/upstream) reading from one source of truth.
