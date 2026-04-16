---
name: bulkhead-data-simulation
description: Simulation engine pattern for modeling independent resource pools with fault injection, rejection tracking, and time-series history.
category: workflow
triggers:
  - bulkhead data simulation
tags:
  - auto-loop
version: 1.0.0
---

# bulkhead-data-simulation

The bulkhead data simulation defines each partition as an independent state object with a fixed capacity (`max`/`slots`), a mutable usage counter (`active`/`used`), error accumulators (`errors`/`rejected`), and a fault flag (`faulted`/`breached`). The simulation loop runs on a fixed interval (500-800ms) and applies a random walk to each pool's usage — `delta = random(-2, +2)` clamped to `[0, max]` — modeling realistic traffic fluctuation without requiring a real backend. Fault injection toggles the fault flag on a randomly-selected healthy partition; faulted partitions fill toward capacity each tick and accumulate errors, while healthy partitions continue their independent random walk unaffected. This demonstrates the core bulkhead guarantee: a faulted partition degrades in isolation while siblings remain operational. Recovery is time-boxed (e.g., 4-second timeout resets the fault flag and drains active count to zero), modeling real-world circuit-breaker recovery windows.

The rejection mechanism activates when `used >= max`: additional requests increment a `rejected` counter rather than exceeding capacity. This models the mandatory fast-fail behavior of a properly implemented bulkhead — the pool has a hard ceiling, and overflow is explicitly counted rather than silently queued. The monitor app extends this with a rolling time-series history array (`MAX_HIST=60` samples), enabling trend-line rendering that shows per-pool utilization over the last ~48 seconds. Each pool's history is independent, reinforcing the isolation model in the data layer as well as the visual layer.

The reusable simulation recipe is: (1) define N pool objects with `{name, max, used, rejected, history[]}`, (2) run a tick function that applies clamped random-walk deltas and increments rejection on overflow, (3) expose a `faultInject(poolIndex)` that forces a pool to saturate and auto-recovers after a timeout, (4) push each tick's `used` value to the history ring buffer for time-series charting. This pattern applies to any bulkhead simulation — thread pools, semaphore-guarded services, connection pools, or Kubernetes pod resource limits — by substituting the resource name and tuning `max` and tick interval.
