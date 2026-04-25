---
version: 0.1.0-draft
name: spawn-stdout-chunk-boundary-data-loss
description: `child.stdout.on('data', d => d.split('\n'))` silently drops records that span chunk boundaries; large NDJSON events (especially stream-json result with usage/cost) get split by pipe-buffer fills (~64 KB) and both halves fail JSON.parse.
category: pitfall
tags:
  - nodejs
  - child_process
  - stream
  - ndjson
---

# spawn-stdout-chunk-boundary-data-loss

## Failure mode

A Node subprocess emits NDJSON (one JSON record per newline). You wire a simple listener:

```js
child.stdout.on('data', (d) => {
  for (const line of d.toString().split('\n')) handle(line);
});
```

Under load — or whenever any single record exceeds the OS pipe buffer (~64 KB on Linux/Windows) — a `data` event contains a record's head, and the next event contains its tail. Neither half parses. The event is silently dropped.

## Why this bites hard

- It's probabilistic: small records parse fine, so tests pass.
- It targets the **most important** records: large events like LLM `result` with usage and `total_cost_usd` are exactly the ones big enough to split.
- Logs show partial JSON as "plain text noise" and get swallowed by catch-all branches.

## Symptom in the wild

Some cycles show `[import] done $N.NNNN` (cost logged from the success event), others don't — even though drafts were staged in both. The missing ones had their `result` event split across chunks.

## Fix

Buffer across events; only emit complete newline-terminated lines. Flush residual on `close`. See skill `stream-json-line-buffer-across-chunks` for the 10-line pattern.

## Rule

Any `spawn`/`exec` stream that emits line-oriented output **requires** inter-event buffering. Treating `data` as a line is only safe for tiny, infrequent outputs.
