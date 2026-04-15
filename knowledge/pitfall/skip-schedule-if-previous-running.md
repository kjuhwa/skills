---
name: skip-schedule-if-previous-running
description: When a periodic tick arrives and the previous execution for the same job is still running, skip the new tick — never queue it.
type: pitfall
category: pitfall
source:
  kind: project
  ref: lucida-health@99b499a
confidence: high
---

**Fact.** If handler for tick N hasn't finished when tick N+1 arrives, dropping N+1 is correct. Queueing it leads to runaway pile-up that never catches up and produces duplicate measurements.

**Why.** With Kafka-driven ticks (see skill `event-driven-kafka-scheduling`), the consumer doesn't block upstream — ticks keep arriving. If handler is slower than interval (e.g. 80s work on a 60s schedule because one target is slow), queueing makes each subsequent tick wait longer, worker memory fills with pending ticks, and when you finally recover you emit a burst of back-dated measurements that misalign downstream rollups.

**How to apply.**
- Per-`jobId` `AtomicBoolean inFlight` (or `Set<String>`). On tick: `if (!inFlight.compareAndSet(false, true)) { log.warn("skip — previous still running"); return; }`. Clear in `finally`.
- Emit a `scheduler.skipped` counter metric — frequent skips signal the handler needs parallelism or the interval is too tight.
- Do NOT "extend" the interval as a workaround — fix the slow target (see pitfall `actuator-metric-call-aggressive-timeout`) or shard the work across workers.

**Counter / Caveats.** For jobs where every tick MUST run (e.g. billing), skip-is-wrong — use a queue with back-pressure instead. This rule only applies to idempotent snapshot jobs where losing a tick is better than doubling it.
