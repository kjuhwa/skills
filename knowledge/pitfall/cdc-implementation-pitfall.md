---
version: 0.1.0-draft
name: cdc-implementation-pitfall
description: Common CDC mistakes: losing position state, mishandling tombstones, and breaking transaction boundaries
category: pitfall
tags:
  - cdc
  - auto-loop
---

# cdc-implementation-pitfall

The most damaging CDC bug is losing the consumer's last-committed log position. If a connector restarts without durable position state, it will either re-emit already-consumed events (causing duplicate writes downstream) or skip forward to the current tail (causing silent data loss). Position must be checkpointed *after* the downstream sink acknowledges the write, never before — at-least-once delivery requires the checkpoint to trail the ack, and sinks must be idempotent on the primary key. A surprising number of CDC demos checkpoint on event emit, which is wrong and teaches the wrong pattern.

Tombstone handling is the second landmine. Kafka-based CDC uses null-value records as tombstones for compacted topics, meaning a DELETE is represented as a key with `value=null`. Consumers that filter out null values to "skip bad data" will silently drop deletes, leaving downstream systems with phantom rows forever. Always preserve tombstones through the pipeline and only materialize them at the terminal sink. Similarly, UPDATE events without a full "before" image make it impossible to reconstruct deletions-by-predicate downstream — always configure the source for full row images (`REPLICA IDENTITY FULL` in Postgres, `binlog_row_image=FULL` in MySQL) even though it costs log volume.

Transaction boundary violations are the subtlest failure. If a consumer processes events as they arrive without buffering until `COMMIT`, it can expose uncommitted intermediate state to downstream systems — a classic case is a money-transfer transaction where the debit event is applied but the credit event is dropped due to a crash, leaving a split-brain ledger. Always buffer events by `txId` and only release them to sinks after observing the commit marker, or use transactional outbox semantics on the sink side. This becomes especially tricky with large transactions that exceed memory; spill-to-disk buffering is mandatory for any production-grade CDC pipeline.
