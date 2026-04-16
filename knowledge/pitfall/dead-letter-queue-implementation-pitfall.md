---
name: dead-letter-queue-implementation-pitfall
description: Common failure modes when building DLQ tooling: replay loops, payload loss, and silent growth
category: pitfall
tags:
  - dead
  - auto-loop
---

# dead-letter-queue-implementation-pitfall

The most dangerous DLQ pitfall is the replay loop: an operator bulk-replays 50,000 messages from DLQ back to the source topic, the same bug re-fails them, they land in DLQ again, and if any automation triggers re-replay (or if the operator retries "because it didn't work"), the system oscillates and consumer lag explodes. Mitigation requires tracking `replayAttempts` as a message header that survives the round-trip, enforcing a hard cap (typically 3) beyond which the message is quarantined and cannot be replayed without an explicit override. Without this counter, each replay looks like a "fresh" DLQ entry to the tooling and the loop is invisible until lag metrics scream.

Payload loss is the second common failure: DLQ entries often store a truncated or serialized-to-string form of the original message for display purposes, and operators accidentally replay that display form instead of the original binary payload. The fix is to always store the raw bytes (original key, value, headers) separately from any human-readable projection, and make the replay action use the raw bytes exclusively. A related pitfall: stripping headers during DLQ write — this loses the traceparent, original timestamp, and schema version, making root-cause analysis impossible later. Headers must be preserved verbatim; failure metadata goes into *new* headers (e.g., `x-dlq-reason`, `x-dlq-original-topic`), never by overwriting existing ones.

Silent growth is the third trap: DLQs have no consumer by default, so they grow unboundedly and eventually hit broker retention or disk limits. Teams discover this when old DLQ messages silently age out and are lost before anyone investigates. The fix is threefold: (1) set an explicit, long-but-finite retention on the DLQ topic separate from normal topics, (2) alert on DLQ size growth rate, not just absolute size — a DLQ growing at 10x its normal rate matters even when the absolute count is small, and (3) always archive evicted DLQ messages to cold storage (S3/GCS) before retention purges them, so post-mortems on week-old incidents remain possible.
