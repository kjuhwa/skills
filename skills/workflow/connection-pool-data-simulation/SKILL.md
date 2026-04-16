---
name: connection-pool-data-simulation
description: Tick-based probabilistic simulation strategies for generating realistic connection-pool demand, state transitions, and lifecycle events.
category: workflow
triggers:
  - connection pool data simulation
tags:
  - auto-loop
version: 1.0.0
---

# connection-pool-data-simulation

Simulate pool behavior with three layered tick loops at different cadences. The **demand layer** (fast tick, 400ms) models external load as a random-walk target: `target = clamp(target + randInt(-2, +2), 0, maxDemand)`. Active connections chase the target in bounded steps (`Math.ceil(Math.random() * 2)` per tick) so transitions look organic, not instantaneous. Idle is derived as `poolSize − active`; waiting is `max(0, demand − poolSize)`. Expose +Load / −Load buttons that shift the target by ±3 for interactive demos. This counter-based model is lightweight — no per-connection objects needed — and suits dashboards tracking aggregate metrics.

The **per-connection layer** (medium tick, 1.5–2 s) manages an array of connection objects `{id, state, born, timer}`. Background demand fires at 60 % probability per tick, acquiring a random idle connection. Each acquired connection auto-releases after a uniform-random hold time (1–3 s for queries, 2–5 s for interactive demos). Model on-demand growth by spawning a new connection when the idle list is empty and `pool.length < maxPool`; if the pool is full, busy-wait with recursive `setTimeout` until a slot opens. This object-based model enables per-connection identity, age tracking, and individual lifecycle visualization.

The **lifecycle layer** adds a closing state with a 20 % post-release probability: the connection enters a 1.2 s closing phase (simulating TCP teardown / resource cleanup) before removal from the pool. New connections backfill via the demand layer. Seed the pool with 40–50 % of max capacity at startup so the first seconds aren't empty. All probabilities and timing constants should be tunable via a config object so the simulation can be sped up for demos or slowed down for classroom walkthroughs.
