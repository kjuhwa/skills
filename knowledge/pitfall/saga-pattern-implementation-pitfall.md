---
name: saga-pattern-implementation-pitfall
description: Common failure modes when implementing saga orchestration — compensation ordering, idempotency gaps, and partial-failure visibility.
category: pitfall
tags:
  - saga
  - auto-loop
---

# saga-pattern-implementation-pitfall

The most dangerous pitfall in saga implementations is **compensation ordering violations**. The saga guarantee is that compensations execute in strict reverse order of the completed forward steps. If compensations fire out of order — for example, refunding a payment before releasing reserved inventory — downstream services may observe inconsistent intermediate states (a refund record with stock still locked, or an orphaned shipping booking). In simulation code this is easy to get right with a simple reverse loop, but in production with async message brokers, compensation messages can arrive out of order unless you enforce sequential processing per saga ID. Always key compensation consumers by saga ID to preserve ordering, and never fan out compensations in parallel unless the compensating actions are provably commutative.

A second pitfall is **non-idempotent compensations**. In the visualization apps, each compensation runs exactly once because the simulation is synchronous and deterministic. In distributed systems, network retries and at-least-once delivery mean a compensation handler may fire multiple times. If "Refund Payment" is not idempotent, the customer gets double-refunded. Every compensation must be designed as an idempotent operation — use a compensation ID or saga-step correlation key to detect duplicates. This also applies to the forward steps: if "Reserve Stock" times out and the orchestrator retries, you may double-reserve unless the inventory service deduplicates by saga step ID.

A third pitfall is **invisible partial failure** — the saga fails and compensations succeed, but no human or monitoring system notices. The simulation apps solve this with explicit red/amber coloring and a text log, but production systems often lack equivalent observability. When a saga enters compensation mode, emit a structured alert (not just a log line) with the saga ID, the failing step, the number of compensations triggered, and whether all compensations succeeded. If a compensation itself fails (a "compensation failure" — the hardest case), the saga is in a poisoned state that requires manual intervention. Design a dead-letter or "stuck saga" dashboard that surfaces these cases within minutes, not hours. The timeline viewer pattern — showing every event with status and timestamp — is exactly the UI shape that an ops team needs for this.
