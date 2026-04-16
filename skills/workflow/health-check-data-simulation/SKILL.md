---
name: health-check-data-simulation
description: Generating realistic health-check sample streams with failure modes, flapping, and recovery curves for dev/demo
category: workflow
triggers:
  - health check data simulation
tags:
  - auto-loop
version: 1.0.0
---

# health-check-data-simulation

Production health-check data is rare in dev environments, so simulate it with a deterministic generator seeded per-subsystem. Each subsystem gets a state machine with four modes: `healthy` (values jitter around a mean well below threshold), `degrading` (linear or exponential drift toward threshold), `failing` (values pinned above threshold with noise), and `recovering` (decay back toward healthy with occasional bounces). Transitions are probabilistic per tick with configurable dwell times, which produces the realistic "amber for a while, then red, then slowly back to green" shapes that make visualizations believable.

Build the simulator as a tick function emitting one sample per subsystem per interval (default 5s), with a scenario file that declares initial states and scheduled events: `{ at: '+30s', subsystem: 'database', mode: 'failing' }`, `{ at: '+2m', subsystem: 'database', mode: 'recovering' }`. This lets demos reliably reproduce the same incident story across radar/vitals/timeline apps. Include a "flapping" mode that oscillates pass/fail at configurable frequency — essential for testing that timeline views don't alias and that alerting logic debounces correctly.

Persist a rolling buffer (e.g. last 24h at 5s resolution ≈ 17k samples per subsystem) in memory or IndexedDB so timeline zoom-out works without regenerating history. Expose a `speed` knob (1x/10x/60x) so a 2-hour scenario can be demoed in 2 minutes. Keep the generator framework-agnostic — ship it as a plain function so radar/vitals/timeline can each import it and render their own lens over identical data.
