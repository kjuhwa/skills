---
name: data-pipeline-implementation-pitfall
description: Common failure modes when building pipeline visualizations — unit confusion, missing backpressure, and unbounded telemetry buffers.
category: pitfall
tags:
  - data
  - auto-loop
---

# data-pipeline-implementation-pitfall

The most common pitfall is conflating record counts and byte rates on the same edge label — a pipeline moving 1M tiny records/sec looks identical to one moving 1k large records/sec unless you pick one primary unit per edge and put the other in a tooltip. Teams also routinely forget to visualize backpressure: they show throughput going *into* each stage but not buffer depth or consumer lag, so a silently-stalled sink looks healthy until the source's buffer overflows. Always render the buffer as a first-class signal, not a tooltip detail.

The builder app fails silently when schema validation runs only at "deploy" time rather than on edge-connect. Users wire up a 12-stage DAG, hit deploy, and get a wall of type errors — fix this by validating each connection at draw time and blocking incompatible joins with a clear inline reason ("source emits `Order`, transform expects `Invoice`"). Related: don't let users save a DAG with cycles or orphan stages; detect and highlight these on the canvas, not in a modal after save.

The monitor app's killer bug is unbounded telemetry retention in browser memory — a pipeline emitting per-second samples for 20 stages over a day is 1.7M points and will freeze the tab. Use fixed-size ring buffers per stage (e.g. 300 samples at 1 s resolution, then downsample to 1 min for older data) and drop the raw samples on rotation. Also beware timezone drift between the simulator's synthetic timestamps and the chart axis — always render in the user's local TZ but store UTC, or the timeline scrubber will be off by hours after DST.
