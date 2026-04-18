---
version: 0.1.0-draft
name: connection-pool-implementation-pitfall
description: Common errors when modeling or implementing connection pool visualizers, simulators, and config labs
category: pitfall
tags:
  - connection
  - auto-loop
---

# connection-pool-implementation-pitfall

The most frequent modeling error is treating acquisition as instantaneous when the pool is below max - real drivers pay 10-200ms for TCP+TLS+auth handshake on new physical connections, and failing to simulate this creates misleading "thundering herd" visualizations where max-pool-size appears infinitely elastic. Always distinguish logical acquisition (pop from free list, ~µs) from physical connection creation (handshake, ~ms-100ms), and render them as visually distinct events. Related trap: validation queries (SELECT 1, isValid()) are often modeled as free, but testOnBorrow adds measurable latency to every acquisition and is a real config trade-off users need to see.

Second pitfall is conflating idle-timeout with max-lifetime. Idle-timeout reaps connections that have been in the free list too long (protects against stale sockets from firewall NAT reset); max-lifetime forcibly retires connections regardless of state after N minutes (protects against slow memory leaks, DNS changes, credential rotation). Visualizers that expose only one slider collapse two independent failure modes and leave users unable to diagnose "why do my connections churn every 30 min on a quiet system" - the answer is always max-lifetime, never idle-timeout. Config labs should expose both with separate sliders and separate reference lines on the age histogram.

Third pitfall is waiter queue starvation semantics. Many implementations use LIFO for the free list (better cache locality on recently-used connections) but FIFO for waiters (fairness) - mixing these up in a simulator produces either unrealistic fairness guarantees or pathological starvation that does not match HikariCP/pgbouncer/c3p0 behavior. Also, acquisition-timeout must fire from the waiter side, not the pool side: a waiter that times out should emit a TIMEOUT event and free its slot in the FIFO immediately, or the queue visualization will show phantom waiters that have already given up.
