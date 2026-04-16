---
name: connection-pool-implementation-pitfall
description: Common traps when building connection-pool visualizations — stale timers, missing closing state, and demand-capacity mismatch.
category: pitfall
tags:
  - connection
  - auto-loop
---

# connection-pool-implementation-pitfall

**Timer leak on state overlap.** When a connection is manually toggled (click) while an auto-release `setTimeout` is still pending, the old timer fires and forces the connection back to idle even though the user just re-acquired it. All three apps reveal this: the bubbles app sets a new timer on acquire but never clears the previous one. The fix is to store the timer handle on the connection object and call `clearTimeout(conn.timer)` before every state transition. In the lifecycle app this is doubly dangerous because a stale timer can push a connection into the closing phase while it is actively serving a query, corrupting the swimlane view.

**Missing or silent closing state.** The monitor and bubbles apps model only two states (active/idle), which hides the real-world cost of connection teardown. In production pools (HikariCP, pgBouncer), a connection being validated or evicted is neither idle nor truly active — it is draining. If your visualization omits this phase, users undercount "unavailable" connections and over-estimate pool headroom. The lifecycle app's 1.2 s closing phase is a better model, but its 20 % flat probability is naive; real eviction is usually age-based (`maxLifetime`) or failure-based. A more faithful simulation triggers closing when `age > maxLifetime` or after a simulated error event.

**Demand exceeding capacity without back-pressure feedback.** The monitor app allows demand up to 30 against a pool of 20, showing a "waiting" counter — but the bubbles and lifecycle apps silently drop excess demand (busy-wait or ignore). This mismatch confuses users comparing the views side by side. When demand exceeds capacity, every visualization should surface it: the chart as a waiting line, the bubble grid as a pulsing "queued" indicator outside the grid, and the swimlane as a fourth "Waiting" lane. Without explicit back-pressure visibility, the demo teaches users that connection exhaustion is invisible — exactly the wrong lesson for production pool tuning.
