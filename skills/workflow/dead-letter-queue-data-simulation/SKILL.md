---
name: dead-letter-queue-data-simulation
description: Techniques for generating realistic DLQ mock data including topic-scoped failures, severity distributions, retry counters, and time-bucketed heatmap grids.
category: workflow
triggers:
  - dead letter queue data simulation
tags:
  - auto-loop
version: 1.0.0
---

# dead-letter-queue-data-simulation

DLQ data simulation centers on modeling the message lifecycle: a message originates from a topic, fails at a consumer with a specific exception, accumulates a retry count, and carries metadata (timestamp, severity, original payload). The autopsy-table simulator (`mockData`) generates N records by randomly selecting from domain-realistic topic names (order.created, payment.process, user.signup, inventory.update, email.send, audit.log) and exception classes (TimeoutException, NullPointerException, ConnectionRefused, SchemaValidationError, RateLimitExceeded, DeserializationError). Severity is uniformly drawn from critical/warning/info, retries from 0–4, and timestamps are scattered within the last 24 hours using `Date.now() - Math.random() * 864e5`. Payloads embed a user key and a monetary amount to mimic real event bodies. The pattern is: define your topic and error vocabularies as arrays, then compose records by random-indexing into each array with `Math.random() * arr.length | 0`.

The flow visualizer simulates message routing by assigning a failure probability (30%) at spawn time. Each particle carries a boolean `fail` flag and a `retry` flag. On reaching the Consumer zone, the flag determines whether the particle routes to Done or DLQ. The "Retry All" action resets the DLQ counter, increments the retried counter, and re-spawns particles with `retry: true` so they bypass the failure branch — modeling the real-world behavior where retried messages often succeed because transient errors have cleared. Burst mode spawns 8 particles with staggered setTimeout delays (80 ms apart) to simulate producer spikes without overwhelming the animation.

The heatmap simulator builds a 2D grid (topics × 24 hours) where each cell is initialized with a ~35% chance of having 0–13 failures and a 65% chance of zero. A 2-second interval then applies random ±1 drift clamped to [0, 15], simulating the gradual accumulation and resolution of failures over time. This drift model is more realistic than pure random replacement because it produces temporal correlation — cells that are "hot" tend to stay hot for several ticks before cooling, mirroring real DLQ behavior where a bad deployment or downstream outage causes sustained failures on specific topics during specific hours.
