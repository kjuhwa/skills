---
name: connection-pool-implementation-pitfall
description: Common traps in connection pool simulation and visualization: counter drift, queue starvation, and tick-rate coupling.
category: pitfall
tags:
  - connection
  - auto-loop
---

# connection-pool-implementation-pitfall

**Counter drift between visual and logical state** is the most frequent bug. If `idle` is tracked independently from `active` (as in the monitor app: `pool.idle = Math.min(pool.idle + 1, MAX - pool.active)`), a release-then-evict sequence within the same tick can produce `active + idle > MAX` briefly, or negative idle if eviction fires before the release increments idle. The fix is to derive `idle` as `allocatedSlots - active` rather than maintaining it as a separate mutable counter. Any time you display multiple gauges (active, idle, waiting), derive all but one from the authoritative counter to prevent impossible states showing up in the dashboard.

**Wait queue starvation and silent timeout drops** occur when `maxWait` is too short relative to average execution time, or when `drainQueue()` only promotes one waiter per release event. If three connections finish in the same tick, only the first triggers `drainQueue()`; the other two transitions set `active = false` without checking the queue again. The lifecycle app avoids this because each lane's completion independently calls `drainQueue()`, but a batched-tick architecture (process all lanes, then drain once) would leave waiters stranded for an extra tick cycle. In production pool libraries (HikariCP, c3p0), this maps to the real bug of notify-one vs. notify-all on the wait semaphore—visualizations that only drain one waiter per release faithfully model notify-one but can mislead users into thinking the pool is slower than it should be.

**Tick-rate coupling to simulation fidelity** is a subtler trap. The monitor ticks at 500ms, bubbles at 1500ms, lifecycle at 100ms—and each hardcodes its probability thresholds to that rate. Changing the tick interval without recalibrating probabilities makes the pool appear overloaded or idle. For example, doubling the monitor's tick rate to 250ms without halving the 40% acquire probability effectively doubles the request arrival rate. Reusable simulations should parameterize arrival rate as events-per-second and convert to per-tick probability (`p = 1 - e^(-rate * tickInterval/1000)`) rather than hardcoding magic constants like `0.4` or `0.6`.
