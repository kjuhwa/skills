---
name: outbox-pattern-implementation-pitfall
description: Three critical failure modes in outbox relay implementations — duplicate polling races, in-flight counter drift, and unbounded queue bloat with poison message cycling.
category: pitfall
tags:
  - outbox
  - auto-loop
---

# outbox-pattern-implementation-pitfall

**Duplicate polling** is the most insidious outbox pitfall. When a relay polls the outbox table, there is a window between reading a row and marking it as processed where a concurrent poller (or a re-triggered interval) can grab the same message. The flow simulator models this with the gap between `sendEvent` and `runRelay` — both can be triggered independently via buttons or auto-mode, and nothing prevents overlapping invocations. In production, this requires `SELECT ... FOR UPDATE SKIP LOCKED`, an explicit status column with atomic compare-and-swap updates, or single-consumer partition assignment. Without this guard, the broker receives duplicates, and every downstream consumer must be idempotent — a requirement that is easy to state but expensive to enforce across an entire microservice topology. The simulator's manual+auto concurrent trigger paths perfectly model this race condition.

**In-flight counter drift** occurs when bookkeeping for "messages currently being relayed" falls out of sync with actual message state. The dashboard tracks three counters (sent, failed, pending) and must decrement pending exactly once per relay attempt regardless of outcome. The 700ms delay between the relay poll and the publish resolution in the simulator creates a brief period where the message exists in neither the "pending" nor the "sent/failed" state — it is in-flight. If a retry succeeds after a prior failure, the pending counter must not double-decrement. Getting this wrong produces phantom in-flight counts that never resolve or negative values that erode operator trust. The dashboard's per-second rate display amplifies this: a single bookkeeping error in a 1-second tick window produces a visible spike or dip that misleads capacity-planning decisions.

**Queue bloat and poison message cycling** are the slow-burn operational killers. The dashboard's 50-event cap and the simulator's 15-row table cap are deliberate safeguards against the production equivalent: an outbox table that grows unbounded because delivered rows are never truncated. Unindexed status columns turn polling queries into full table scans as the table grows. The 7–10% simulated failure rate demonstrates how failed messages accumulate: without a dead-letter mechanism or max-retry cap, poison messages cycle endlessly through poll→fail→re-queue, consuming relay capacity and starving healthy messages of processing slots. The simulator makes this visible — failed entries persist in the outbox table while new events stack up behind them — but in production, such stuck messages are invisible without explicit alerting on `pending_duration > threshold` or a dead-letter topic that surfaces chronic failures.
