---
version: 0.1.0-draft
tags: [arch, kafka, avro, schedule, event, chain]
name: kafka-avro-schedule-event-chain
description: Collection scheduling decouples Kafka ingress from per-DBMS handlers via four typed BlockingQueues
category: arch
source:
  kind: project
  ref: lucida-domain-dpm@c0758569
---

# Kafka → typed BlockingQueue fan-out for collection scheduling

**Fact.** The DPM collection pipeline does NOT run collection inline on the Kafka listener thread. Ingress flow:

`Kafka(JobExecuteNotice, Avro)` → wrap into `DpmCollectionEvent(orgId, payload)` → `GlobalScheduleHandler` enqueues to one of four `BlockingQueue`s keyed by job class: `measurement`, `config`, `availability`, `history` → dedicated consumer thread per queue dispatches to the per-DBMS service.

**Why:** collection jobs have very different latency/volume profiles. Measurement ticks are high-frequency and short; history jobs are rare and heavy. Putting them on the same executor means a slow history job starves measurement collection. Four queues with independent consumers gives per-class backpressure and isolation without a full priority-scheduler.

**How to apply.**
- When orchestrating mixed-latency background work fed by a single message bus, prefer N typed queues + N consumer threads over one shared thread pool.
- Keep the Kafka listener thread pure routing (header read → event wrapper → enqueue) — no collection work inline, no blocking I/O.
- Size each queue's capacity to the SLA of its job class, not to an aggregate.

**Evidence.**
- `src/main/java/com/nkia/lucida/domain/dpm/common/schedule/GlobalScheduleHandler.java` (queue definitions, dispatch loop).
- `DpmCollectionEvent` wrapper carries `organizationId` for tenant propagation across the hand-off.
