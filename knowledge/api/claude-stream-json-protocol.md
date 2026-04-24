---
name: claude-stream-json-protocol
summary: Claude Code CLI's stream-json mode emits typed JSON events (assistant, user, system, result, log) that wrap content blocks like text/thinking/tool_use/tool_result.
category: api
tags: [claude-code, streaming, json-protocol, llm, agent]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: server/pkg/agent/claude.go
imported_at: 2026-04-18T00:00:00Z
---

Launch Claude in non-interactive stream mode with:

```
claude -p --output-format stream-json --input-format stream-json --verbose \
  --strict-mcp-config --permission-mode bypassPermissions
```

Input is written to stdin as JSON objects: `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"..."}]}}` then close stdin. Output is NDJSON on stdout; each line has a top-level `type`:

- `assistant` — `message.content[]` blocks: `text`, `thinking`, `tool_use` (has `id`, `name`, `input`). `message.usage` carries token counts (input, output, cache_read, cache_creation) per model name.
- `user` — tool_result blocks via `content[]`, referenced by `tool_use_id`.
- `system` — carries `session_id`; use this ID for `--resume`.
- `result` — terminal event with `result` (final text), `is_error`, `duration_ms`, `num_turns`, `session_id`.
- `log` — passthrough for `level` + `message`.

Session resume: if `--resume <id>` is passed and the session doesn't exist, Claude prints an error to stderr, generates a fresh session, and exits. If the emitted session ID differs from the requested one AND the run failed, treat the session ID as unusable (return empty) so a retry-with-fresh-session path can trigger.

Flags that must be blocked from user-configured `custom_args` because they break the protocol: `-p`, `--output-format`, `--input-format`, `--permission-mode`, `--mcp-config`.

Child environment leakage: strip `CLAUDECODE`, `CLAUDECODE_*`, `CLAUDE_CODE_*` from the child env so the spawned Claude doesn't inherit the parent Claude's session state.

## Why

Wrapping a coding-agent CLI as an RPC backend needs a stable wire format. Stream-JSON is the only one Claude supports non-interactively that exposes tool calls and thinking. Buffered stdout scanning with a 10MB max token size handles large tool outputs without breaking.

## Evidence

- `server/pkg/agent/claude.go:129-220` — scanner and event handlers.
- `server/pkg/agent/claude.go:316-420` — Go types for the JSON wire format.
- `server/pkg/agent/claude.go:383-416` — blocked-args filter and protocol flag list.
