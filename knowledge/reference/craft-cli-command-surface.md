---
name: craft-cli-command-surface
summary: One-page reference for the craft-cli command taxonomy: info/health, resource listing, session ops, streaming send, power-user invoke/listen, self-contained run, and the 21-step --validate-server.
category: reference
tags: [cli, rpc, reference]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: docs/cli.md
imported_at: 2026-04-18T00:00:00Z
---

# craft-cli command surface

The CLI is a thin WebSocket client for the Craft Agent server, used for scripting, CI, and validation. Its command surface is partitioned into 5 groups:

1. **Info & health**
   - `ping` — connectivity + latency, returns client ID.
   - `health` — credential store health check.
   - `versions` — server runtime versions.

2. **Resource listing** (supports `--json` for jq-friendly output):
   - `workspaces`, `sessions`, `connections`, `sources`.

3. **Session operations**:
   - `session create [--name] [--mode]`
   - `session messages <id>` — prints message history.
   - `session delete <id>`
   - `cancel <id>` — cancel in-progress processing.

4. **Send / stream**:
   - `send <id> <message>` — subscribes to session events and streams to stdout. Emits `text_delta` inline, `[tool: name]` markers for tool_start, truncated tool_result (200 chars), errors to stderr (exit 1), clean completion (exit 0), user interrupt (exit 130).
   - Accepts piped stdin if the message arg is omitted or `--stdin` is set.

5. **Power user**:
   - `invoke <channel> [json-args...]` — raw RPC call.
   - `listen <channel>` — subscribe to push events until Ctrl+C.

6. **Self-contained runs**:
   - `run <prompt>` — spawns a headless server, creates a session, sends the prompt, streams, and exits. No separate server setup. Accepts `--workspace-dir`, repeatable `--source <slug>`, `--output-format text|stream-json`, `--mode`, `--no-cleanup`, LLM config flags.
   - `--validate-server` — 21-step integration test. Auto-spawns a server when no `--url`. MUTATES workspace state (creates + deletes a temp session, source, skill). Continue-on-failure; summarizes at end.

### Connection resolution
Flags beat env vars: `--url` / `CRAFT_SERVER_URL`, `--token` / `CRAFT_SERVER_TOKEN`, `--workspace` (auto-detected), `--timeout`, `--tls-ca` for self-signed certs, `--send-timeout` for `send`.

### Why this taxonomy matters
It mirrors the server RPC channel groups (`system:*`, `sessions:*`, `sources:*`, `skills:*`, `LLM_Connection:*`) one-to-one. Adding a server channel + CLI sub-command is a mechanical, parallel change; no surprise translations.

### Sources
`docs/cli.md`, `apps/cli/src/index.ts`, `apps/cli/src/commands.test.ts`.
