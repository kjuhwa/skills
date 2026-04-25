---
name: proxy-mailbox-jsonl-ipc-pattern
description: Decouple an agent process from remote-hub auth/retry concerns by routing every network call through a local HTTP proxy that persists an append-only JSONL mailbox, so the agent only does local reads/writes and the proxy owns registration, heartbeats, retries, and sync.
category: architecture
version: 1.0.0
version_origin: extracted
tags: [ipc, daemon, jsonl, local-proxy, agent-architecture, offline-first]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 4c51382092f9cb125d3ec55475861ead8d1463a6
source_project: evolver
source_paths:
  - SKILL.md
  - src/gep/mailboxTransport.js
  - src/gep/a2aProtocol.js
imported_at: 2026-04-18T03:00:00Z
---

# Proxy Mailbox IPC Pattern

Use this when an agent must communicate with a remote hub but you want the agent code itself to stay **offline-first, synchronous-feeling, and unaware of auth/retry**.

## Shape

```
Agent process --(HTTP localhost)--> Proxy daemon --(real network)--> Hub
                                        |
                                        +-- JSONL mailbox on disk
```

- **Agent side** only does `fetch('http://127.0.0.1:<port>/mailbox/send', ...)` and `/mailbox/poll`. No API keys, no retry logic, no backoff.
- **Proxy side** is a long-running daemon that: registers the node, refreshes tokens, retries failed sends, syncs the mailbox in both directions, and exposes a tiny local HTTP API.
- **Mailbox** is a JSONL file per queue (inbound/outbound). Every message has `message_id`, `type`, `status` (`pending` / `synced` / `failed`). The agent polls by `type`.

## Discovery

Proxy writes a settings file so the agent can auto-discover the URL:

```json
// ~/.<product>/settings.json
{
  "proxy": {
    "url": "http://127.0.0.1:19820",
    "pid": 12345,
    "started_at": "2026-04-10T12:00:00.000Z"
  }
}
```

Agent reads this on startup — no hard-coded port, no env var required.

## Minimal Endpoint Surface (recommended)

| Method | Path | Purpose |
|---|---|---|
| POST | `/mailbox/send` | Enqueue outbound `{type, payload}` → `{message_id, status: "pending"}` |
| POST | `/mailbox/poll` | Drain inbound by filter `{type?, channel?, limit?}` |
| POST | `/mailbox/ack` | Ack processed inbound ids so they stop being returned |
| GET  | `/mailbox/status/:id` | Lifecycle check for a specific message |
| GET  | `/proxy/status` | `{status, node_id, outbound_pending, inbound_pending, last_sync_at}` |

The agent never needs more than these five.

## Why this is worth the indirection

1. **Auth isolation.** Tokens live only inside the proxy, never inside prompt-generating code. Agent compromise does not leak creds.
2. **Offline continuity.** `send` always succeeds locally — hub outage becomes a sync-lag problem, not a crash.
3. **Audit trail for free.** The JSONL mailbox is the log. Replaying it reproduces state.
4. **Multiple agents share one proxy.** Several processes on the same host pool their outbound queue through one node identity.

## Implementation notes

- Timeouts on the local HTTP call should be short (10s) because there's no real network.
- The send handler should return immediately after the local write — actual hub POST happens in the proxy's background sync loop.
- Keep the mailbox JSONL per-type or per-channel; splitting avoids mega-file rewrites on ack.
- Registration/heartbeat on the proxy side should be idempotent so the agent never has to care whether it "already registered."

## When NOT to use this

- Single short-lived CLI invocations where starting a proxy daemon is overkill.
- Strict request/response semantics where synchronous error surface matters (the mailbox is async by design).
- Systems without a writable user-scoped directory for the settings file.
