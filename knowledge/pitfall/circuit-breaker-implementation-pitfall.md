---
name: circuit-breaker-implementation-pitfall
description: Common circuit breaker bugs: flapping, stuck HALF_OPEN, wrong window semantics, and thundering-herd recovery
category: pitfall
tags:
  - circuit
  - auto-loop
---

# circuit-breaker-implementation-pitfall

The most frequent circuit breaker bug is **flapping between CLOSED and OPEN** because the failure threshold uses a count-based window without hysteresis — a breaker that trips at 5 failures and resets at 0 will oscillate under steady 50% error rates. Fix this with either (a) separate trip and reset thresholds (trip at 50% failure, require 80% success to close), (b) a minimum OPEN-state duration regardless of probe result, or (c) a rolling time window (not count window) so transient bursts smooth out. The simulator must expose this: showing a count-only breaker flapping visibly teaches the lesson better than documentation.

The second pitfall is **stuck HALF_OPEN**: if the probe request hangs (no timeout) or if multiple probes are allowed concurrently, the breaker either never transitions or floods the recovering downstream. HALF_OPEN must permit exactly one in-flight probe with a hard timeout, and that probe's timeout counts as failure. Grid implementations often forget this and let each cell send unlimited probes, producing a thundering herd when many breakers recover simultaneously — stagger recovery with jittered cooldowns.

The third pitfall is **window semantics confusion**: sliding-window vs. tumbling-window vs. exponentially-weighted moving average produce very different trip behaviors for the same input. Puzzle-style apps compound this by displaying one window type in the UI while computing state from another, making solutions feel non-deterministic. Always display the exact window the state machine uses, label it explicitly (e.g., "10s sliding window, bucket=1s"), and surface the bucket boundaries — otherwise users cannot reason about why a trip did or didn't happen at a given tick.
