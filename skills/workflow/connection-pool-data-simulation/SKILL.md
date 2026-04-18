---

name: connection-pool-data-simulation
description: Deterministic simulation model for generating realistic connection pool workloads across acquisition, validation, and eviction events
category: workflow
triggers:
  - connection pool data simulation
tags: [workflow, connection, pool, data, simulation]
version: 1.0.0
---

# connection-pool-data-simulation

Simulate connection pool behavior with a discrete event loop driven by three independent Poisson arrival streams: request arrivals (λ_req, the workload), connection failures (λ_fail, usually 0.1-1% of checkouts), and idle timeouts (deterministic, driven by wall clock against each slot's last-returned timestamp). Each request draws a service time from a log-normal or bimodal distribution (fast OLTP queries ~5-20ms, slow reports ~200ms-2s) - never uniform, because real pool pathologies emerge only when the tail of slow queries collides with max-pool-size. Keep the simulator deterministic by seeding all RNGs and advancing a logical clock, so replay and A/B config comparison are reproducible.

Model the pool itself as three queues: free list, in-use set, and waiter FIFO with per-waiter acquisition-timeout deadlines. On request arrival, pop from free list if available; else create a new physical connection if below max; else enqueue on waiter FIFO. On request completion, validate the connection (optional validation probability), then either return to free list, retire if exceeded max-lifetime, or destroy on failure. Surface events as a typed stream (ACQUIRE, CREATE, RETURN, VALIDATE_FAIL, TIMEOUT, EVICT) so the UI layer can animate individual transitions rather than just polling aggregate counts.

Seed realistic scenarios as presets: "steady state" (λ_req below capacity), "thundering herd" (λ_req spike 10x for 3s), "slow query storm" (service time tail doubles), "network flap" (λ_fail jumps to 20% for 10s), and "leak" (0.5% of requests never return). These five cover ~90% of real-world pool incidents and let users build intuition without waiting for production to misbehave.
