---
version: 0.1.0-draft
name: load-balancer-implementation-pitfall
description: Common bugs when implementing load balancer algorithms in a simulation, especially consistent hashing and least-connections
category: pitfall
tags:
  - load
  - auto-loop
---

# load-balancer-implementation-pitfall

The biggest trap in consistent-hash-ring is under-provisioning virtual nodes. With only 1 vnode per physical backend, the ring is catastrophically uneven — one backend can own 40%+ of keyspace purely by hash luck, and the demo misleads viewers into thinking consistent hashing is bad. Use 100–200 vnodes per backend minimum, and compute vnode positions as `hash(backendId + ":" + i)` not `hash(backendId) + i` (the latter clusters vnodes adjacently and defeats the point). Also: when a node is removed, you must re-sort the ring or use a sorted structure — naive array splicing during live traffic causes the "clockwise next owner" lookup to race and route requests to a just-removed node for a few frames.

For least-connections, the pitfall is decrementing `activeConnections` at the wrong moment. If you decrement when the request animation finishes (visual completion) rather than when `serviceTimeMs` elapses (logical completion), the algorithm's decisions lag the visual state and look broken. Keep simulation state and render state strictly separate — the balancer reads logical counters only. A related bug: ties in "least connections" resolved by insertion order cause a single backend to absorb all traffic during low load; break ties with the seeded PRNG or a round-robin tiebreaker.

For weighted round-robin, never implement it as "repeat each backend N times in a list" — that produces bursty assignment (AAABBC AAABBC). Use the interleaved/smooth weighted round-robin algorithm (nginx's variant with `current_weight += weight; pick max; current_weight -= total`) so a 3:2:1 pool emits ABACAB, not AAABBC. Viewers immediately notice burstiness and assume the algorithm is broken. Finally, guard against divide-by-zero when all backends are marked unhealthy mid-simulation: the balancer must enter a visible "no healthy upstream" state rather than silently dropping requests, or the metrics panel shows misleading zeros.
