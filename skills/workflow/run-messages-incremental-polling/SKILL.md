---
name: run-messages-incremental-polling
description: Monotonic sequence numbers on streamed task messages enable cheap incremental polling (--since seq) so live UI fetches only the tail, not the whole log.
category: workflow
version: 1.0.0
tags: [polling, streaming, task-messages, cli, pagination]
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: medium
---

## When to use

- An agent execution streams many messages (tool calls, thinking blocks, text) and a UI wants a live view.
- WebSocket is overkill or not available (CLI polling).

## Steps

1. Schema: each message row on a task has a monotonic `seq` (BIGSERIAL per-task is fine):
   ```sql
   CREATE TABLE task_messages (
     id UUID PRIMARY KEY,
     task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
     seq BIGSERIAL,
     type TEXT NOT NULL,   -- text | thinking | tool_use | tool_result | error | log
     payload JSONB NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     UNIQUE (task_id, seq)
   );
   ```
2. API endpoint accepts `?since=<seq>`:
   ```
   GET /api/tasks/:taskId/messages?since=42
   → 200 { messages: [{ seq: 43, type: "text", ... }, { seq: 44, ... }], has_more: false }
   ```
   Limit page size (e.g. 500) and return `has_more` if truncated.
3. CLI surface:
   ```
   multica issue run-messages <task-id>              # full log
   multica issue run-messages <task-id> --since 42   # incremental
   ```
4. Caller (UI, CLI watcher) keeps local `maxSeq`; each poll sends `since=<maxSeq>`, appends returned messages, updates `maxSeq`.

## Example

In a CLI "watch this run" command:
```bash
last_seq=0
while :; do
  payload=$(multica issue run-messages $TASK --since $last_seq --output json)
  echo "$payload" | jq -r '.messages[] | "\(.seq)\t\(.type)\t\(.payload.text // .payload.tool_name)"'
  last_seq=$(echo "$payload" | jq '.messages[-1].seq // '$last_seq)
  [ "$(echo "$payload" | jq '.status')" = '"completed"' ] && break
  sleep 1
done
```

## Caveats

- `BIGSERIAL` per-task is easiest, but on insert-heavy systems may become a sequence-bottleneck — measure before switching to a ULID + timestamp index.
- Clients should tolerate gaps in the seq sequence (cleanup jobs, rare races). Treat returned `seq` as authoritative "what I've seen"; don't assume contiguous.
- On task completion, emit a sentinel message (or set a terminal status the client can observe) so watchers know to stop polling.
