---
version: 0.1.0-draft
name: xlog-extended-transaction-trace-with-compression
summary: XLog is scouter's per-request transaction trace format — hierarchical typed steps stored as compressed binary, indexed by end-time, with flat metadata for server-side filtering
category: api
confidence: high
source_type: extracted-from-git
source_url: https://github.com/kjuhwa/scouter
source_ref: master
source_commit: 126bb19f07d1fe4fe915eb408c381e2c140cc94c
source_project: scouter
tags: [xlog, tracing, apm, format, scouter]
---

## Fact

Every instrumented request becomes one XLog entry: `txid`, `start`, `end`, `elapsed`, status/error flags, user/URI metadata, and a step buffer. The step buffer is a typed hierarchy: MethodStep, SqlStep (with bind vars), ApiCallStep (external HTTP), MessageStep, ErrorStep — each with its own start/elapsed. The buffer is compressed per-entry; flat metadata stays uncompressed so the server can filter by URI / status / user without decompressing. XLog scatter charts plot (end_time, elapsed) per entry — instantly surfaces hot paths. This differs from span-based distributed tracing: XLog is per-transaction-centric, distributed correlation is added via PCODE/GXID fields rather than being native to the format.

## Evidence

- `scouter.document/client/Reading-XLog.md`
- `scouter.common/src/main/java/scouter/lang/pack/Pack.java`
- `scouter.agent.java/src/main/java/scouter/agent/trace/TraceMain.java`

## How to apply

If you're evaluating or integrating with scouter: treat XLog as the primary debug artifact — it's where you see "why was this request slow." If you're designing a new APM and care about (a) cheap storage and (b) fast "find all recent slow transactions" queries, the end-time + compressed-steps pattern is a strong default.
