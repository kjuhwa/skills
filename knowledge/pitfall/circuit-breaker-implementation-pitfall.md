---
name: circuit-breaker-implementation-pitfall
description: Common bugs when implementing the HALF_OPEN probe state and failure window accounting
category: pitfall
tags:
  - circuit
  - auto-loop
---

# circuit-breaker-implementation-pitfall

The most common circuit breaker bug is mishandling the HALF_OPEN state: implementations often allow unlimited concurrent probe calls through, which defeats the purpose of a cautious recovery check and can slam a recovering dependency with a thundering herd. Always gate HALF_OPEN to a fixed small number of in-flight probes (typically 1–3), reject or queue the rest, and only transition to CLOSED after K consecutive probe successes — not after the first success, which gives a false positive on flaky dependencies.

A second frequent pitfall is failure-window accounting: using a simple running counter that never resets causes the breaker to trip on stale failures from hours ago, while clearing the counter on every success hides bursty failure patterns. The correct approach is a time-bounded sliding window (e.g., last 60 seconds) or a bounded ring buffer of the last N outcomes. Also ensure that timeouts, circuit-rejected calls, and actual errors are classified distinctly — counting circuit-rejected calls as "failures" creates a self-reinforcing loop where the breaker never closes.

Finally, beware of clock-driven cooldown bugs in simulators: using `setInterval` or wall-clock timestamps without a single monotonic tick source causes drift between the visualization and the state machine, so the UI shows CLOSED while logic is still OPEN (or vice versa). Centralize time on one tick authority — a logical clock for simulation, or `performance.now()` monotonic readings for live systems — and derive all transition deadlines from it.
