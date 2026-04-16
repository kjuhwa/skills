---
name: circuit-breaker-implementation-pitfall
description: Common mistakes in circuit breaker state management — failure counter resets, half-open race conditions, and timeout drift.
category: pitfall
tags:
  - circuit
  - auto-loop
---

# circuit-breaker-implementation-pitfall

The most dangerous bug in circuit breaker implementations is incorrect failure counter resets. In the dashboard app, failures reset to zero only on a successful HALF-OPEN→CLOSED transition (`if(state==='half-open'){state='closed';failures=0}`), but the flow app resets failures to zero on *any* trip to OPEN (`failures=0; transition('open')`). This discrepancy means the flow app loses its failure history when re-opening from HALF-OPEN, while the dashboard accumulates failures across open/half-open cycles until an explicit recovery. In production, resetting failures on OPEN entry is standard (since the breaker is already tripped, the count served its purpose), but failing to reset on CLOSED recovery creates a "sticky" breaker that trips faster on each subsequent cycle because residual failure counts lower the effective threshold.

The HALF-OPEN state is inherently racy in concurrent systems but even in single-threaded simulations it's easy to mishandle. The flow app allows failures to increment past the threshold in HALF-OPEN (`if(state==='halfOpen'||failures>=THRESHOLD)`) which means a rapid button click can push failures to 6/5 before the trip fires — cosmetically wrong and a sign that the guard should check state *before* incrementing. In the timeline app, HALF-OPEN uses a higher failure probability (0.35 vs 0.18) but no request limiting, so the probing window can silently send dozens of requests to an unhealthy service before tripping again. Real breakers (e.g., Resilience4j's `permittedNumberOfCallsInHalfOpenState`) cap HALF-OPEN probes to a fixed count.

Timeout drift is subtle across these apps: the dashboard uses per-service wall-clock timeouts (5–10 seconds) checked every 800ms tick, meaning the actual open duration can overshoot by up to 800ms. The timeline uses a fixed tick-count cooldown (15 ticks × 400ms = 6s nominal) which is precise in ticks but drifts if `setInterval` jitters under load. Neither approach handles the case where a browser tab is backgrounded (timers throttled to 1s+), which can cause a breaker to appear stuck in OPEN long after its timeout has logically expired. Production implementations should use monotonic clocks or event-driven timeouts rather than polling-based checks.
