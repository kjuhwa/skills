---
name: connection-pool-data-simulation
description: Probabilistic tick-based simulation of connection acquire/release/wait/evict cycles for realistic pool behavior demos.
category: workflow
triggers:
  - connection pool data simulation
tags:
  - auto-loop
version: 1.0.0
---

# connection-pool-data-simulation

The simulation models four pool operations as independent per-tick probability rolls: **acquire** (~40% chance, increments `active` up to `MAX`), **release** (~35% chance, decrements `active`, bumps `idle`), **idle eviction** (~20% chance, decrements `idle` to simulate keepalive expiry), and **queue drain** (deterministic—if `waiting > 0` and `active < MAX`, immediately promote one waiter). Each tick runs every 100–500ms depending on the visualization's granularity needs. The pool state is a single object `{ active, idle, waiting, max }` mutated in-place, with history pushed to a bounded array (`history.length > N → shift()`) for time-series rendering. This produces realistic-looking curves: bursts of acquisitions that approach the ceiling, periods of gradual release, and occasional queue buildup that resolves when capacity frees.

For the lifecycle variant, each acquired connection gets a randomized execution duration (`1000 + Math.random() * 3000` ms) and a countdown that decrements by the tick interval. When `remaining ≤ 0`, the connection auto-releases and triggers `drainQueue()` which FIFO-pops the oldest waiter and calls `tryAcquire(waiterId)`. Waiters track their `born` timestamp; a separate filter pass expires any waiter whose age exceeds `maxWait`, removing its DOM element and dropping it silently—modeling real connection timeout behavior where the caller gets a timeout exception rather than a connection.

Request generation uses a simple Bernoulli trial (`Math.random() < 0.6` every 400ms) with an initial seed burst (e.g., 5–6 immediate requests) to avoid a cold-start empty pool. The combination of random arrival, random execution duration, and configurable pool size / max wait creates emergent behaviors—pool exhaustion waves, queue spikes, idle drain periods—without scripted scenarios, making it suitable for demos, load testing UIs, and educational tools.
