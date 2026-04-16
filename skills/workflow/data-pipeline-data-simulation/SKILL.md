---
name: data-pipeline-data-simulation
description: Generate realistic synthetic pipeline telemetry with bursty arrivals, stage-specific latency, and controllable failure injection.
category: workflow
triggers:
  - data pipeline data simulation
tags:
  - auto-loop
version: 1.0.0
---

# data-pipeline-data-simulation

Simulate pipeline traffic with a per-stage generator rather than a single global stream. Each stage has its own service-time distribution (e.g. source: Poisson arrivals at λ rps; transform: lognormal processing time; sink: fixed batch flush every N ms or M records). Compose them as a token-passing chain where the downstream stage's buffer depth feeds back into upstream admission — this is what produces the realistic backpressure curves and lag spikes that a naive `rate * jitter` generator cannot reproduce. Seed the RNG per scenario so demos and screenshots are reproducible.

Expose a small control surface — arrival rate, burst multiplier, failure rate per stage, and a "slow stage" toggle that multiplies one stage's service time by 5–20× — so reviewers can drive the graph through the four canonical states: steady-state, burst absorption, backpressure propagation, and dead-letter accumulation. For the monitor app, replay a recorded scenario tape rather than live-generating, so the timeline scrubber stays deterministic. For the builder app, run a dry-run simulation of the authored DAG against a sample record batch and surface any schema/type errors inline before the user hits "deploy."

Keep the simulator out of the render loop: run it on a Web Worker or a requestAnimationFrame-decoupled tick so graph animation stays smooth even when simulating 50k rps, and buffer telemetry into fixed-size ring buffers (last 5 min @ 1 s resolution) for the monitoring charts.
