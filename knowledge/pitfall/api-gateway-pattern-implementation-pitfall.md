---
version: 0.1.0-draft
name: api-gateway-pattern-implementation-pitfall
description: Conflating gateway-added latency with backend latency and letting rate-limit state leak across gateway replicas
category: pitfall
tags:
  - api
  - auto-loop
---

# api-gateway-pattern-implementation-pitfall

The most common modeling mistake across all three variants is charting a single "latency" number that actually sums gateway overhead + backend RTT. Users then "optimize" their gateway config and see no change because 95% of the number was the backend. Always expose two stacked series — `gateway_overhead_ms` (auth+match+transform time measured inside the gateway process) and `backend_rtt_ms` (time from forward to response) — and make the gateway-overhead series the default visible one. The inspector variant makes this worse by adding body-parse cost that's easy to attribute to the backend; meter it separately as `inspect_ms` and subtract it from overhead on a toggle.

The second pitfall is stateful rate-limiting that silently assumes one gateway replica. A token bucket kept in process memory works perfectly in the demo but, when users take the pattern to production with 4 gateway pods behind a load balancer, each pod holds its own bucket and the effective limit is 4× what was configured. The simulation must either show multiple gateway-replica lanes with independent buckets (visually demonstrating the drift) or model a shared store (Redis with a visible round-trip cost added to gateway_overhead) so users learn that "rate limit = 100 rps" is a distributed-systems problem, not a single-number config.

Third, route-matching order is non-obvious and frequently wrong. If `/users/*` is registered before `/users/admin/*`, the admin route never matches — the gateway greedy-matches the prefix. The traffic-router app must visualize the match-attempt order (animated sequential highlight down the route table until one hits) rather than showing a magical "routed to X" verdict; otherwise users copy the pattern, reorder their real routes alphabetically, and spend an afternoon wondering why admin endpoints 404.
