---
name: dead-letter-queue-implementation-pitfall
description: Common failure modes when building DLQ monitoring and retry systems, from unbounded accumulation to poison pill loops and misleading severity signals.
category: pitfall
tags:
  - dead
  - auto-loop
---

# dead-letter-queue-implementation-pitfall

The most dangerous DLQ pitfall visible across these apps is the poison pill loop: when a message fails due to a permanent error (schema mismatch, null required field, payload exceeding size limits) and gets retried repeatedly without ever succeeding. The retry-arena models this with its 40% failure-on-retry probability, but in production, the critical missing piece is a max-retry threshold with automatic routing to a permanent dead-letter archive. Without this, poison pills consume retry bandwidth indefinitely, starving transient failures (like connection timeouts or rate limits) that would actually succeed on retry. The topology-map's accumulating `reasons` array demonstrates how a single DLQ node can collect 7+ distinct failure types — mixing permanent failures with transient ones — making triage impossible without per-reason filtering.

A second pitfall is unbounded DLQ growth without backpressure. The pulse-monitor tracks total count and rate but has no alerting threshold — in production, a DLQ growing faster than it drains signals either a downstream outage or a deployment regression, and the monitoring layer must distinguish between the two. The topology-map's probabilistic increment/decrement (60/40 split) simulates a slowly-growing queue, which in reality indicates the retry success rate is below the inflow rate — a condition that requires immediate intervention, not gradual observation. Building a DLQ dashboard without configurable alert thresholds (e.g., "fire if DLQ depth exceeds 100 for 5 minutes" or "fire if inflow rate exceeds drain rate for 3 consecutive intervals") makes the monitoring decorative rather than operational.

A third pitfall is conflating message age with message urgency. The pulse-monitor displays "oldest message" timestamp, but oldest does not mean most critical — a 3-hour-old analytics event is less urgent than a 5-minute-old payment failure. Effective DLQ systems must expose per-queue priority and SLA metadata, not just global FIFO ordering. Similarly, the retry-arena's flat card list treats all messages equally, but production systems need priority lanes: payment DLQs should retry before notification DLQs, and messages approaching their SLA deadline should jump the queue. Without priority-aware retry scheduling, the system processes easy-to-resolve low-priority messages while high-priority poison pills age out silently.
