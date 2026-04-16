---
name: dead-letter-queue-data-simulation
description: Timer-driven synthetic DLQ message generation with domain-realistic failure reasons, queue topics, and probabilistic retry outcomes.
category: workflow
triggers:
  - dead letter queue data simulation
tags:
  - auto-loop
version: 1.0.0
---

# dead-letter-queue-data-simulation

The simulation layer across all three apps follows a consistent generator pattern: a fixed array of queue/topic names (orders, payments, notifications, analytics, user-events) paired with a fixed array of DLQ-specific failure reasons (Timeout, Schema mismatch, Auth expired, Rate limited, Connection refused, Deserialization error, TTL expired, Invalid routing key, Consumer rejected, Poison pill). Each tick, a message is constructed by randomly selecting a queue and a reason, assigning an attempt count (1–5), a severity level weighted by probability (30% error, 30% warning, 40% info), and a timestamp. Messages are capped with a rolling window — pulse-monitor keeps the latest 50 entries, retry-arena caps at 12 active DLQ items, and topology-map grows DLQ counts unbounded but with a 60% chance of increment vs 40% chance of decrement to simulate partial recovery.

The retry simulation in the arena models a probabilistic outcome: when a user clicks retry, the message transitions to "retrying" state, waits 1.5–3.5 seconds (simulating network round-trip and consumer processing), then resolves with 60% success probability or returns to DLQ on failure with an incremented attempt counter. This models real-world exponential backoff behavior where most transient failures resolve within a few retries but poison pills cycle indefinitely. New DLQ messages auto-generate every 3 seconds only when the dead-letter column has fewer than 12 items, preventing UI overflow while maintaining a steady-state appearance.

The topology simulation adds a per-DLQ-node failure reason registry that accumulates dynamically — each 2.5-second tick has a chance to append a new reason string (from a pool of "Retry exhausted", "Parse error", "Null pointer", "Connection reset") up to a cap of 10 reasons per node, modeling how real DLQs accumulate diverse failure modes over time rather than repeating a single cause. All timers use `setInterval` at domain-appropriate cadences: 600ms for pulse data (near-realtime monitoring), 3s for new message generation (steady inflow), and 2.5s for topology state changes (infrastructure-level drift).
