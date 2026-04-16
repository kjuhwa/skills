---
name: message-queue-data-simulation
description: Stateful topic-based message simulation with produce/consume cycles, DLQ routing, and event audit trails.
category: workflow
triggers:
  - message queue data simulation
tags:
  - auto-loop
version: 1.0.0
---

# message-queue-data-simulation

The data simulation pattern models message queues as plain JavaScript objects keyed by topic name (e.g., `{orders:[], alerts:[], logs:[]}`), where each message carries an auto-incremented `id`, `body`, `topic`, and `ts` (timestamp). Production appends to the topic array; consumption shifts from the front (FIFO). The critical differentiator from naive array demos is the DLQ (dead-letter queue) routing: on each consume, a random failure check (`Math.random() < 0.15`) diverts the message to a separate `dlq[]` array instead of discarding it, preserving the original message's topic and id for later inspection. This 15% failure rate is tunable and provides a realistic error surface for testing retry and alerting UIs.

Two independent `setInterval` loops drive the simulation: a producer loop (2.5s interval) that randomly selects a topic and publishes sample payloads from a predefined corpus (`['New order placed', 'Payment received', ...]`), and a consumer loop (3.2s interval) that randomly picks a topic and consumes if non-empty. The intentional asymmetry between produce rate (faster) and consume rate (slower) causes natural queue buildup and drain cycles, which is essential for making monitoring dashboards visually interesting. For the monitoring variant, per-queue state tracks `produced`, `consumed`, `errors`, `rate` (net messages/sec), and `size` clamped to `maxSize` — enabling capacity percentage calculations.

The event audit trail pattern (`events.unshift({time, text, err})`) builds a reverse-chronological log capped at 50 entries, rendered as a scrollable timeline with error entries highlighted in red. Each event records a human-readable action string like `"Published #5 → orders"` or `"#3 failed → DLQ"`. This audit trail is the connective tissue between the publish panel, queue state, and DLQ — without it, users lose track of why messages ended up where they did.
