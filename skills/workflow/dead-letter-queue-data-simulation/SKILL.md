---

name: dead-letter-queue-data-simulation
description: Generating realistic DLQ fixtures with clustered failure signatures, retry metadata, and replay outcomes
category: workflow
triggers:
  - dead letter queue data simulation
tags: [workflow, dead, letter, queue, data, simulation]
version: 1.0.0
---

# dead-letter-queue-data-simulation

Realistic DLQ simulation data cannot be uniformly random — real DLQs exhibit heavy skew where 3-5 failure signatures account for 70-90% of entries. Generate fixtures by first defining a signature catalog (e.g., `DeserializationException@avro-schema-v2`, `NullPointerException@OrderEnricher.enrich:47`, `TimeoutException@downstream-api`, `ConstraintViolation@duplicate-key`) with assigned weights that sum to 1.0, then sample from it using weighted random selection. Each simulated message needs: `originalTopic`, `consumerGroup`, `partition`, `offset`, `firstFailureAt`, `lastFailureAt`, `retryCount` (typically 3-5, drawn from the consumer's retry policy), `errorSignature`, `stackTraceHash`, `payloadBytes`, and `headers` including the traceparent for cross-service correlation.

Temporal clustering is essential: real DLQs fill in bursts when upstream deploys roll out bugs or when downstream dependencies degrade. Simulate this by injecting "incident windows" — 5-30 minute intervals where failure rate spikes 10-100x and a specific signature dominates. Between incidents, baseline rate should be low (1-5 msgs/min) with mixed signatures. This makes the data realistic for testing rate-based alerting, bulk-replay workflows, and Pareto analysis.

For replay outcome simulation, model three outcomes with configurable probabilities: `replay_succeeded` (the bug was transient or fixed), `replay_failed_same_error` (bug still present — should route back to DLQ, not loop), and `replay_failed_new_error` (fix introduced a different problem). Track a `replayAttempts` counter per message and flip messages to `quarantined=true` after exceeding a threshold. When seeding a visualizer, also generate correlated downstream metrics (consumer lag spike, error-rate spike on source topic) so the DLQ fill pattern is causally consistent with the system-level signals an operator would see on their dashboards.
