---
name: cdc-data-simulation
description: Generating realistic CDC event streams for building and demoing CDC tooling without a real database
category: workflow
triggers:
  - cdc data simulation
tags:
  - auto-loop
version: 1.0.0
---

# cdc-data-simulation

Real CDC pipelines (Debezium, Maxwell, pg_logical) are expensive to stand up for UI work, so simulate the envelope instead. Emit events matching the Debezium envelope shape: `{op: c|u|d|r, before: {...}, after: {...}, source: {db, table, ts_ms, lsn, txId, snapshot}, ts_ms}`. Generate monotonically increasing LSNs per source, group 1-20 row events under a shared `txId` with tight `ts_ms` spacing to simulate transactions, and sprinkle in occasional schema-change (DDL) markers and heartbeat events so the UI's handling of non-row messages is exercised.

Drive the generator with three tunable knobs: **throughput** (events/sec with burst multipliers), **lag injection** (artificial delay between source ts_ms and consumer receive time, with occasional stalls to simulate replication slot backpressure), and **conflict rate** (percentage of events whose `before` image disagrees with the current target state, to feed the conflict resolver). For the replay timeline tool, pre-generate a bounded LSN range (e.g. 1M events across a 2-hour window) and serve it from a static file so scrubbing is instant — live streams only make sense for the monitor.

Keep simulation and real-source adapters behind the same interface (`CDCSource` yielding envelope events). This lets you swap in a real Kafka consumer pointed at Debezium topics later without rewriting the UI. Seed the random generator so demos and screenshots are reproducible, and expose the seed in the URL so bug reports can reference an exact event sequence.
