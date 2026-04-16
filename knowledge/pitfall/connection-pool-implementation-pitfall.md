---
name: connection-pool-implementation-pitfall
description: Timer leaks on re-acquire, missing closing/drain state, and silent demand overflow cause incorrect pool behavior in visualizations.
category: pitfall
tags:
  - connection
  - auto-loop
---

# connection-pool-implementation-pitfall

**Timer leak on state overlap.** When a connection is re-acquired (manually or via queue hand-off) while a previous TTL countdown is still running, the old timer fires and forces the connection back to idle mid-use. The monitor app's `slot.timer = 30 + Math.random() * 120` overwrites the counter value but this only works because it uses a decrement-per-tick model. The bubbles app's `ttl` field is similarly overwritten safely — but if either app were refactored to use `setTimeout` instead of tick-based decrement, the previous timeout handle would leak. Any pool simulation using real timers must store the handle on the connection object and call `clearTimeout(conn.timerHandle)` before every state transition. In the queue hand-off path (where a just-released slot is immediately re-acquired for a waiter), this is especially dangerous because the release and acquire happen in the same tick, making the stale-timer race invisible during testing but reproducible under load.

**Missing closing/drain state.** All three apps model only two states: active and idle. Real connection pools (HikariCP, pgBouncer, Go's `sql.DB`) have at least a third: draining/validating/closing. A connection being evicted due to `maxLifetime` expiry, failed validation (`testOnBorrow`), or network error is neither idle nor serving queries — it occupies a slot but cannot accept work. Omitting this state means the visualization over-reports available capacity. Users watching a dashboard that shows 8/20 active and concluding 12 are available may actually have only 9 if 3 are mid-eviction. The fix is to add a `state` enum (`idle | active | closing`) with a closing duration of 1-2 seconds and an age-based or error-triggered eviction probability, then render closing slots in a distinct warning color (orange) rather than idle gray.

**Silent demand overflow without back-pressure visibility.** The monitor app tracks a `waiting` counter and renders it in the stats bar, but the bubbles app silently queues objects that age out and vanish after 300 frames with no user-visible feedback. The tuner calculates inflated latency when `pendingQueue > 0` but never shows the queue depth itself. This inconsistency teaches users that connection exhaustion is invisible — exactly the wrong mental model for production. Every pool visualization must surface demand overflow explicitly: as a numeric counter, a visual queue (dots, stacked bars), and ideally a timeout event (the monitor's `timeouts` counter with red log entries). Without this, the demo masks the most critical production signal: the moment demand exceeds capacity and queries start waiting.
