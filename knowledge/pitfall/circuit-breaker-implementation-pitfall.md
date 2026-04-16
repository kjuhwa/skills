---
name: circuit-breaker-implementation-pitfall
description: Common state machine bugs, timing traps, and simulation fidelity gaps in circuit-breaker implementations.
category: pitfall
tags:
  - circuit
  - auto-loop
---

# circuit-breaker-implementation-pitfall

The most dangerous pitfall is **HALF_OPEN instability from high probe failure rates**. Setting the HALF_OPEN failure probability too high (35–40%) while also resetting failures to 50% of the threshold on entry creates a near-certain oscillation loop: the breaker trips back to OPEN before a single success can land, making recovery effectively impossible during sustained (even moderate) downstream degradation. The fix is either lowering the HALF_OPEN failure rate, resetting failures to 0 on entry, or requiring N consecutive successes rather than a single one — but each changes the behavioral character of the breaker significantly. A related issue is **single-success recovery**: real circuit breakers (e.g., Resilience4j) require a configurable number of permitted calls in HALF_OPEN before deciding, but naive implementations close the breaker on the very first success, which masks ongoing instability.

**Cooldown timer precision** is another trap. Using `setInterval(fn, 1000)` for the cooldown while rendering at a different rate (e.g., 50ms for particles, 800ms for state ticks) creates desync — the cooldown can expire mid-render-frame, causing a one-tick visual glitch where the state label says OPEN but the color already shows HALF_OPEN. The solution is to drive all timers from a single tick source rather than mixing independent intervals. Additionally, **failure counter overflow/underflow** must be clamped: without `Math.min(failures, threshold)` on increment and `Math.max(0, failures)` on decrement, the counter can exceed the threshold (making recovery require extra successes) or go negative (creating a "credit" buffer that delays future trips). Finally, **no request processing during OPEN** means the timeline shows gaps — recording `null` outcomes is correct but confuses users who expect to see rejected-request markers. Explicitly rendering rejected requests as a distinct third color (e.g., gray dots) would avoid the "missing data" misinterpretation.
