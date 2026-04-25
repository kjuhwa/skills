---
version: 0.2.0-draft
name: change-stream-resilient-consumer
description: "MongoDB change-stream consumer — survives elections, field-filters, coordinates instances via distributed lock"
category: backend
tags:
  - mongodb
  - change-stream
  - resilience
  - distributed-lock
  - field-filter
  - replica-set

composes:
  - kind: skill
    ref: backend/mongodb-changestream-field-filter
    version: "*"
    role: relevance-filter
  - kind: knowledge
    ref: pitfall/mongodb-changestream-resubscribe
    version: "*"
    role: failure-recovery
  - kind: knowledge
    ref: pitfall/mongodb-single-node-directconnection
    version: "*"
    role: connection-prerequisite
  - kind: skill
    ref: backend/distributed-lock-mongodb
    version: "*"
    role: cross-instance-coordination

recipe:
  one_line: "MongoDB change stream consumer that survives elections + network hiccups, filters by changed field, and coordinates across instances via a distributed lock."
  preconditions:
    - "Consumer reacts to field-specific updates (not all writes) on documents it cares about"
    - "Deployment is a MongoDB replica set or sharded cluster (change streams require it)"
    - "Two or more consumer instances may run concurrently and must not duplicate work"
  anti_conditions:
    - "Single-instance consumer with no concurrency — distributed lock is wasted budget"
    - "Polling-based ETL is acceptable — change streams add operational complexity"
    - "Document changes are full-document overrides — field filter has nothing to filter"
    - "Standalone MongoDB (not a replica set) — change streams are unsupported"
  failure_modes:
    - signal: "Consumer silently stops receiving events after a network hiccup or election"
      atom_ref: "knowledge:pitfall/mongodb-changestream-resubscribe"
      remediation: "Wrap the consumer in a watchdog that explicitly stops and re-subscribes on stream termination; do not rely on driver auto-recovery"
    - signal: "Client hangs on primary discovery against a single-node replica set"
      atom_ref: "knowledge:pitfall/mongodb-single-node-directconnection"
      remediation: "Pass directConnection=true on the connection string for single-node deployments"
    - signal: "Two instances process the same change event concurrently"
      atom_ref: "skill:backend/distributed-lock-mongodb"
      remediation: "Acquire findAndModify lock keyed at change-event granularity before the handler runs; release in finally"
  assembly_order:
    - phase: connect
      uses: connection-prerequisite
      branches:
        - condition: "single-node replica set"
          next: subscribe
        - condition: "multi-node replica set or sharded cluster"
          next: subscribe
    - phase: subscribe
      uses: relevance-filter
    - phase: filter
      uses: relevance-filter
    - phase: lock
      uses: cross-instance-coordination
      branches:
        - condition: "lock acquired"
          next: process
        - condition: "lock contended (peer holds it)"
          next: watchdog
    - phase: process
      uses: relevance-filter
    - phase: watchdog
      uses: failure-recovery
      branches:
        - condition: "stream terminated"
          next: subscribe
        - condition: "still healthy"
          next: process

binding: loose

verify:
  - "every composes[].ref is installed in the hub"
  - "every composes[].version range intersects the installed version"
  - "the watchdog explicitly re-subscribes on stream termination (does not rely on driver auto-recovery)"
  - "the distributed lock is keyed at change-event granularity, not at consumer-process granularity"
---

# MongoDB Change Stream Resilient Consumer

> A reactive consumer that watches a MongoDB change stream, drops irrelevant events via a field filter, coordinates with sibling consumers via a distributed lock, and survives the two failure modes change streams ship with: silent termination on network/election events, and connection hangs against single-node replica sets.

<!-- references-section:begin -->
## Composes

**skill — `backend/mongodb-changestream-field-filter`**  _(version: `*`)_
relevance-filter

**knowledge — `pitfall/mongodb-changestream-resubscribe`**  _(version: `*`)_
failure-recovery

**knowledge — `pitfall/mongodb-single-node-directconnection`**  _(version: `*`)_
connection-prerequisite

**skill — `backend/distributed-lock-mongodb`**  _(version: `*`)_
cross-instance-coordination

<!-- references-section:end -->

## When to use

- React to specific field updates (not all writes) on documents the consumer cares about
- Multi-instance deployment where two or more consumer pods may share the workload
- Replica set or sharded cluster with change streams enabled
- Long-running consumer pipelines (hours to weeks) where any silent termination is unacceptable

## When NOT to use

- Single-instance consumer with no concurrency — the distributed lock is just overhead
- Polling-based ETL is acceptable — change streams add operational and license complexity
- Document changes are full-document overrides — the field filter has nothing to filter
- Standalone MongoDB (not a replica set) — change streams are unsupported

## Phase sequence

```
[0] Connect           → directConnection=true on single-node replica sets
[1] Subscribe         → resume token + $match pipeline (collection, ops)
[2] Field-filter      → updateDescription.updatedFields (relevance gate)
[3] Lock              → findAndModify per change event (cross-instance)
[4] Process           → handler runs ONCE per (event × instance-cluster)
[5] Watchdog          → explicit re-subscribe on stream termination
```

### [0] Connect

The connection prerequisite is invisible until production: clients hang on primary discovery against a single-node replica set unless `directConnection=true` is set. Treat it as a connection-string template parameter, not an exception case.

### [1] Subscribe with $match

Subscribe with a `$match` pipeline scoping events to the collection and operation type the consumer cares about. The resume token persists across application restarts so the consumer doesn't replay history.

### [2] Field-filter inside the handler

For UPDATE events, inspect `updateDescription.updatedFields` and drop the event when none of the fields the consumer cares about are present. INSERT/DELETE events fall through (always relevance-positive). This is where most of the noise gets discarded — the change-stream pipeline can't pre-filter beyond `$match`.

### [3] Lock

Before the handler runs, acquire a findAndModify-based distributed lock keyed at change-event granularity (e.g., document `_id` plus a sequence id, OR the change event's resume-token id). This prevents two instances from processing the same event when they share the workload via consumer groups or shard routing. Release the lock in `finally`.

### [4] Process

The handler runs exactly once per (event × instance-cluster). All side effects (DB writes, downstream messages, etc.) happen here. Idempotency is still recommended — the lock can fail under adversarial conditions (instance crash mid-handler).

### [5] Watchdog re-subscribe

The biggest operational pitfall: change streams **do not self-heal**. A network hiccup or replica-set election leaves the stream silently terminated; the consumer thinks everything is fine. The technique requires an explicit watchdog that:

- Detects stream termination (iterator returns no events for a configurable timeout, OR raises a known terminal exception class)
- Stops the current cursor explicitly
- Re-subscribes from the last persisted resume token
- Logs the resubscribe event for observability

## Glue summary

| Added element | Where |
|---|---|
| Connection-string template parameter for single-node replica sets | Connect phase |
| Field filter inside handler complementing the $match pipeline | Filter phase |
| Per-change-event distributed lock keyed at event granularity | Process gate |
| Explicit watchdog with stop-and-resubscribe on termination | Recovery |

## Known limitations

- Lock contention scales with consumer count when many events match the same key. For high-fanout workloads, shard the key space (e.g. lock per `(collection × hash-bucket)`) to avoid serializing the consumer.
- The watchdog timeout is workload-dependent. Too short and the consumer re-subscribes every quiet minute; too long and you lose change events for the duration of the silence. Start at 5× the expected change-stream activity period.
- `directConnection=true` disables high-availability automatic failover; use it only for single-node replica sets, not multi-node deployments.
- The technique assumes idempotent handlers. If the handler is not idempotent, the lock alone is insufficient — add an at-most-once-with-dedup table keyed by resume token.

## Failure modes (mapped to atoms)

| Failure signal | Caused by | Remediation |
|---|---|---|
| Stream silently stops after election | `pitfall/mongodb-changestream-resubscribe` | Explicit watchdog re-subscribes from last token |
| Client hangs on single-node primary discovery | `pitfall/mongodb-single-node-directconnection` | `directConnection=true` |
| Two instances process same event | `skill/distributed-lock-mongodb` (when omitted) | findAndModify lock at event granularity |

## When the technique is succeeding (success signals)

- After a controlled replica-set step-down (election), the consumer logs a re-subscribe event within the watchdog timeout, then resumes from the last token
- During a workload spike, lock contention is bounded by the configured concurrency, not by the event arrival rate
- A rolling deploy of N consumer pods produces a single processing trace per change event in the downstream system

## Why exists

Each of the four composed atoms is independently useful but not sufficient. The field-filter skill teaches you to drop irrelevant events, but says nothing about cross-instance coordination. The two pitfalls warn about silent failure but don't tell you how to detect it. The distributed-lock skill is general-purpose and doesn't know it's running inside a change-stream consumer. This technique is the *combination* — the recipe that pulls the four into a production-shape consumer with a single decision tree from connect to recovery.
