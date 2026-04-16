---
name: read-replica-implementation-pitfall
description: Common failure modes in read-replica lag simulation, stale-read routing, and connection lifecycle tracking.
category: pitfall
tags:
  - read
  - auto-loop
---

# read-replica-implementation-pitfall

The brownian-walk lag model (`lag += (random() - bias) * magnitude`) can produce negative values if the lower bound clamp (`max(0, …)`) is the only guard. In production dashboards this causes momentary "0 ms" readings that mask real lag. A more robust approach floors at a per-replica minimum that reflects network RTT to the AZ. Additionally, the 0.55 downward bias is tuned for animation aesthetics, not realism — real replication lag is heavy-tailed (rare large spikes, long recovery). Replacing the uniform random term with an exponential or log-normal draw and adding a slow exponential-decay recovery produces more faithful simulations for capacity-planning tools.

The random replica selection in the topology app (`replicas[floor(random() * length)]`) ignores lag entirely, meaning a replica at 50 ms lag gets the same traffic as one at 2 ms. In real systems this is the single most common read-replica mistake — routing reads to a lagged replica returns stale data. The load-balancer's "least connections" strategy partially addresses this but tracks connection count, not lag. A production-grade picker should combine lag awareness (exclude replicas above a staleness threshold) with connection balancing, falling back to primary if all replicas exceed the threshold.

The connection lifecycle in the load-balancer uses `setTimeout` to decrement `conns` after a random delay, but there is no upper bound on concurrent connections per replica — under burst traffic, a single replica can accumulate unbounded active connections before any timeouts fire. This mirrors a real pitfall where connection pool exhaustion on one replica cascades: the least-connections algorithm then avoids it, overloading the next-lowest replica in sequence. Production implementations need per-replica connection caps with explicit backpressure (queue or reject) rather than relying solely on the routing algorithm to rebalance.
