---
name: outbox-pattern-implementation-pitfall
description: Common failure modes in outbox relay implementations — duplicate polling, in-flight state drift, queue bloat, and partial-path retry confusion.
category: pitfall
tags:
  - outbox
  - auto-loop
---

# outbox-pattern-implementation-pitfall

**Duplicate polling** is the most insidious outbox pitfall. When a relay polls the outbox table, there's a window between reading a row and marking it as processed where a concurrent poller (or a re-triggered interval) can grab the same message. The flow-simulator addresses this with a `.processing` CSS class that acts as an in-memory lock — but in real systems this requires either `SELECT ... FOR UPDATE SKIP LOCKED`, an explicit `status` column with atomic compare-and-swap updates, or a single-consumer partition assignment. Without this guard, the broker receives duplicate messages, and downstream consumers must be idempotent — a requirement that's easy to state but expensive to enforce across every consumer in a microservice topology. Auto-polling and manual-polling running concurrently (as the simulator allows) perfectly models this race condition.

**In-flight counter drift** occurs when the bookkeeping for "messages currently being relayed" falls out of sync with actual message state. The relay-visualizer tracks three counters (success, failed, in-flight) and must increment in-flight on send, decrement on success, and carefully handle the failed→retry→success path without double-decrementing. If a retry succeeds, in-flight must decrement exactly once for the retry (the original send already decremented on failure). Getting this wrong means dashboards show phantom in-flight messages that never resolve — or negative counts that erode operator trust. The 500ms delay between failure detection and retry spawn is a real-world pattern (backoff before retry), but it creates a brief period where the message exists in neither the "in-flight" nor "retrying" state, which must be accounted for in monitoring.

**Queue bloat and log truncation** are operational concerns the dashboard addresses by capping completed items at 10 in the queue view and event log entries at 50. In production outbox tables, the equivalent pitfall is failing to clean up delivered rows — the outbox table grows unbounded, slowing polling queries (full table scans on unindexed status columns) and inflating storage. The dashboard's 10% failure rate with visible `[ERROR]` entries also demonstrates how failed messages accumulate: without a dead-letter mechanism or max-retry cap, poison messages cycle endlessly through poll→fail→re-queue, consuming relay capacity. The relay-visualizer's partial-path animation (messages that stop at Relay and never reach Broker) makes this failure mode visually obvious, but in production, such stuck messages are invisible without explicit alerting on `pending_duration > threshold`.
