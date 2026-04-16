---
name: load-balancer-implementation-pitfall
description: Common mistakes when simulating load balancer algorithms that make demos misleading
category: pitfall
tags:
  - load
  - auto-loop
---

# load-balancer-implementation-pitfall

The most frequent bug is a round-robin counter that resets or skips when a server goes unhealthy — naive implementations do `servers[i++ % servers.length]` without filtering unhealthy nodes, causing requests to route to dead backends or the modulo to land on the same server repeatedly after a filter. Always filter the healthy set *first*, then index within that filtered array, and persist the counter across ticks (not per-request-closure) so rotation is actually observed. Least-connections has a symmetric trap: if you count connections at request *dispatch* time but decrement at *completion*, a burst of simultaneous arrivals all see the same "minimum" and stampede one server — decrement eagerly or use atomic "reserve-a-slot" semantics.

Weighted round-robin is almost always implemented wrong as `Array(weight).fill(server)` flattened — this works but produces bursty distribution (AAABBC AAABBC). Use smooth weighted round-robin (nginx's algorithm: each tick add weight to currentWeight, pick max, subtract total) to get the interleaved ABACABC pattern users actually expect from production LBs. IP-hash demos break when the hash function has poor distribution on sequential IPs (e.g., `ip.split('.').reduce((a,b)=>a+parseInt(b))` gives terrible spread) — use FNV-1a or at least multiply-shift hashing.

Health checks are the silent killer: if the simulator's health-check tick rate matches the request-generation rate, you get a race where failed servers receive requests in the window between failure and next check. Make the health-check interval user-visible and configurable (default 1s, requests at 50ms) so the detection-delay is *demonstrable*, not hidden. Also: never mark a server healthy on the first successful probe after failure — require N consecutive successes (typically 3) to avoid flapping, and show this counter in the UI so users understand why a "recovered" server isn't immediately receiving traffic.
