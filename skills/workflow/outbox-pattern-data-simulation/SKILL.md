---
name: outbox-pattern-data-simulation
description: Tick-based and stream-based strategies for generating realistic outbox event flows with configurable failure rates, batch polling, and retry mechanics.
category: workflow
triggers:
  - outbox pattern data simulation
tags:
  - auto-loop
version: 1.0.0
---

# outbox-pattern-data-simulation

Outbox simulation requires modeling three distinct phases: **event production** (writes to the outbox table), **relay polling** (reading and forwarding), and **delivery outcomes** (success, failure, retry). Event production uses domain-specific type pools — `['OrderCreated','PaymentProcessed','ItemShipped','UserRegistered','InventoryReserved']` — with each event carrying an incrementing ID (`msg-${counter}`), a randomly selected type, and an ISO timestamp. Batch generation per tick follows `Math.floor(Math.random()*N)+1` to create variable-sized bursts (typically 1–4 events), pushed into a rolling history array (30-point window) for throughput charting. A cascade pattern (`setTimeout` loop with 200ms spacing) seeds the initial state so the UI isn't empty on load.

**Relay polling** operates in two modes. Interval-based polling (`setInterval` at 1200–2000ms) selects 1–3 pending items per cycle, simulating batched `SELECT ... LIMIT N` behavior. Each polled item enters a processing state (visual `.processing` class) for 500–600ms before resolution. The success/failure split uses a configurable probability threshold (`Math.random() > 0.1` for 90% success, or slider-driven `Math.random()*100 < failPercent`). Failed items remain in the queue with an `[ERROR]` log entry; successful items transition to delivered state. Queue filtering partitions items into pending-first ordering, then caps completed items (e.g., keep 10) to bound memory.

**Stream-based simulation** models continuous message flow with jitter (`baseInterval + Math.random()*400ms`) to prevent artificial regularity. Messages traverse a node path (Service→DB→Relay→Broker) with parametric animation (`t: 0→1`, frame increment `0.02*(speedFactor)`). Failed messages follow a truncated path (stop at Relay), then trigger a retry after 500ms from the failure point — not from the beginning — accurately modeling relay-level retry semantics. In-flight counters increment on send and decrement only on final resolution (success or successful retry), preventing counter drift. The speed/delay relationship scales inversely: `delay = baseDelay / (speed/3)` paired with `frameStep = 0.02 * (11 - speed + 2)` ensures animation smoothness across the full speed range.
