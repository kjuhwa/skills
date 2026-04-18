---

name: data-pipeline-data-simulation
description: Generating realistic synthetic pipeline telemetry with backpressure, lag, failure modes, and cascading effects
category: workflow
triggers:
  - data pipeline data simulation
tags: [workflow, data, pipeline, simulation, synthetic]
version: 1.0.0
---

# data-pipeline-data-simulation

Realistic data-pipeline simulation requires modeling each stage as a producer-consumer with a bounded buffer, an ingest rate, and a processing rate drawn from a noisy distribution (e.g., Gaussian around a target with 10-15% jitter plus occasional Poisson spikes). Compute lag per stage as `buffer_depth / processing_rate` and propagate backpressure upstream: when a downstream buffer fills past ~80%, throttle the upstream stage's effective processing rate. This produces the characteristic "lag wave" that real Kafka/Kinesis/Flink pipelines exhibit and makes visualizations feel authentic rather than independent-random.

Seed the simulation with pipeline-specific failure archetypes: (1) schema-drift spikes where error rate jumps on one stage while throughput drops proportionally, (2) slow-consumer scenarios where one stage's rate gradually degrades causing monotonic lag growth, (3) poison-message bursts where a stage's error rate oscillates while throughput stays flat, (4) scheduled-job collisions (for etl-job-scheduler) where two jobs contend for the same sink and both slow down. Drive these via a scenario enum in state so users can switch between "healthy", "degraded-stage-3", "schema-drift", "cascading-failure" and see the visualization respond coherently.

Keep the simulation tick at 250ms-1s and pre-compute ~5-10 minutes of history on mount so charts and sparklines have immediate content rather than starting from empty. Store per-stage time series as ring buffers capped at a fixed length (e.g., 600 points) to prevent memory growth during long demo sessions, and expose a "speed multiplier" control (1x, 5x, 30x) so reviewers can see failure scenarios play out without waiting real time.
