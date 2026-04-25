---
version: 0.1.0-draft
name: agent-runtime-workspace-triple
summary: The registration unit on the server is the (agent provider × runtime/daemon × workspace) triple — one daemon running on one machine registers one runtime per (provider × watched workspace).
category: domain
tags: [daemon, runtime, agents, registration, data-model]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: server/migrations/004_agent_runtime_loop.up.sql
imported_at: 2026-04-18T00:00:00Z
---

A `runtime` on the server is the execution identity for a combination of:

- **daemon_id** — "which physical machine / process"
- **provider** — "which agent CLI" (claude, codex, opencode, ...)
- **workspace_id** — "in which tenant context"

One daemon running on your laptop, with claude + codex installed, watching 2 workspaces, registers **4 runtimes** on the server (2 workspaces × 2 providers). When the server assigns a task to "the Claude runtime in Workspace A on Alice's laptop", it has the exact triple identifying one row, with no ambiguity.

## Why

Without the triple, you can't answer basic questions like "which of my workspaces has a working Claude runtime right now?" or "Alice's laptop has Claude but no Codex — don't route Codex tasks there." Collapsing any of the three into the others loses expressiveness.

Heartbeat carries daemon_id + active runtime count. Deregister on shutdown fires one DELETE per runtime; forgetting this step leaves zombie runtimes that the server thinks are available.

## Evidence

- `server/migrations/004_agent_runtime_loop.up.sql` — runtime table schema.
- `server/internal/daemon/daemon.go:29-35` — `workspaceState` tracks `runtimeIDs` as a slice per workspace.
- CLI_AND_DAEMON.md "How It Works" section — lifecycle description.
