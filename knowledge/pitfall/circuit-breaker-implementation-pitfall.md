---
name: circuit-breaker-implementation-pitfall
description: Common bugs around half-open concurrency, sliding windows, and reset-timeout semantics
category: pitfall
tags:
  - circuit
  - auto-loop
---

# circuit-breaker-implementation-pitfall

The most common bug is treating HALF_OPEN as a single-call gate without bounding concurrency: if many requests arrive simultaneously after `resetTimeout`, a naive implementation lets them all through, defeating the probe's purpose and potentially re-hammering a fragile downstream. Enforce `halfOpenMaxCalls` (typically 1–3) with an atomic counter and reject the rest as if OPEN. Relatedly, a single success in HALF_OPEN should not immediately close the breaker — require N consecutive successes, otherwise a lucky probe during an ongoing incident flips back to CLOSED and the next real call trips it again (flapping).

The failure-counting window is another trap. Using a cumulative counter that only resets on state change means a breaker with 4 failures over an hour trips on the 5th failure a day later — clearly wrong. Use a rolling time window (e.g., last 10 seconds) or a ring buffer of the last N outcomes, and only evaluate the threshold once a minimum-calls floor is met, otherwise low-traffic breakers trip on a single failure. Also decide explicitly whether timeouts count as failures (they usually should) and whether rejected-by-breaker calls feed back into the window (they should not, or the breaker can never recover).

Finally, `resetTimeout` is measured from the transition into OPEN, not from the last failure — a subtle distinction that matters when failures continue arriving during the OPEN state. Those failures must be rejected cheaply without updating any counters or timers; otherwise the breaker keeps extending its own open period and never probes. In distributed settings, remember each instance has its own breaker state by default: coordinating via shared state (Redis) introduces its own failure mode where the coordination layer going down takes all breakers with it, so prefer per-instance breakers with aggregated telemetry.
