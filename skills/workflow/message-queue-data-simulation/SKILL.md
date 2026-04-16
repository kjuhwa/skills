---
name: message-queue-data-simulation
description: Deterministic producer-consumer event generation for reproducible queue behavior demos
category: workflow
triggers:
  - message queue data simulation
tags:
  - auto-loop
version: 1.0.0
---

# message-queue-data-simulation

Generate queue workloads from a seeded PRNG so scenarios replay identically across sessions. Model each producer as an independent Poisson process with a configurable rate (msgs/sec) and each consumer as a service-time distribution (exponential or log-normal). Pre-compute the full event stream into a timestamped array before rendering — this decouples simulation logic from animation and lets the UI scrub backwards. Include fields: `{seq, producerId, topic, priority, payload, producedAt, expectedLatency}`.

For teaching scenarios, hand-craft "pathological" presets alongside random ones: a burst preset (10x normal rate for 2s) to demonstrate backpressure, a slow-consumer preset where service time exceeds arrival rate to show unbounded queue growth, and a priority-inversion preset where low-priority messages pile up behind a stuck high-priority batch. For pub/sub, seed subscriber lag asymmetrically (one fast, one slow, one crashed) so fan-out semantics become visible. Keep preset JSON files under 5KB each and version them — old saved scenarios should still replay.

Surface the simulation clock as a first-class control and let users inject manual events (click producer → emit message now) on top of the scripted stream. Tag injected events distinctly in the trace log so learners can distinguish their experiments from the baseline workload.
