---
name: cdc-implementation-pitfall
description: Common correctness traps when building CDC monitoring, replay, and conflict resolution tooling
category: pitfall
tags:
  - cdc
  - auto-loop
---

# cdc-implementation-pitfall

The biggest trap is treating `ts_ms` as the ordering key. CDC events must be ordered by **LSN/binlog-offset**, not wall-clock timestamp — source clocks skew, NTP jumps, and two events in the same transaction often share `ts_ms` but have distinct LSNs. Timeline scrubbers and "replay from point X" features that key off timestamps will silently reorder rows inside transactions, which in a conflict resolver manifests as phantom conflicts that don't exist in the real source. Always store LSN as the primary sort key and display timestamp as secondary metadata only.

A second trap is dropping or collapsing **tombstone (delete) events** and **heartbeats**. Debezium emits a null-value tombstone after each DELETE for Kafka log compaction; naive filters drop these and the resolver loses the ability to distinguish "row deleted" from "row never existed". Heartbeats are LSN-only envelopes with no row data — they must advance your displayed LSN pointer, otherwise the monitor shows false replication lag during low-write periods and operators chase nonexistent outages.

Third, schema evolution breaks replay. If the user scrubs to an LSN before an `ALTER TABLE ADD COLUMN`, the `after` payload won't have that column and field-level diff in the resolver will render it as "field removed" instead of "field did not yet exist". Keep a schema history table keyed by LSN and render fields that post-date the current LSN as grayed-out "not yet in schema" rather than as diffs. Also remember that snapshot events (`op: r`) carry no `before` image — any UI that assumes `before` is always present will crash on the initial snapshot phase of every new connector.
