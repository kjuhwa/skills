---
version: 0.1.0-draft
name: daemon-task-polling-architecture
summary: Local agent daemon registers runtimes per workspace, polls server for claimed tasks, spawns agent CLI in an isolated workspace dir, streams results back.
category: arch
tags: [daemon, agent, runtime, polling, architecture]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLI_AND_DAEMON.md
imported_at: 2026-04-18T00:00:00Z
---

The local agent daemon is the execution plane for a managed-agents platform:

1. On start: detect installed agent CLIs on `PATH`, register a runtime per (agent × watched workspace).
2. Poll the server at a fixed interval (default 3s) for tasks claimed to this daemon.
3. On task arrival: create an isolated workspace directory under `~/multica_workspaces/...`, spawn the agent CLI there, stream stdout/events back to the server.
4. Send heartbeat every 15s so the server knows the daemon is alive.
5. On shutdown: deregister all runtimes so the server doesn't keep routing tasks to a dead daemon.

Zero workspaces is a valid startup state — a newly-signed-up user may start the daemon before creating their first workspace. The workspace-sync loop polls every 30s and registers runtimes once one appears, so the daemon stays useful as a long-lived background process rather than crashing.

## Why

Pull model (daemon polls server) is simpler than push (server pushes to daemon) for local dev:
- No inbound network requirements — NAT, corporate firewalls, laptops on hotel wifi all work.
- The daemon's poll rate is the only tuning knob; back-off is local.
- Reconnect after sleep is automatic; the daemon doesn't need to maintain a long-lived connection.

Tradeoff: base latency = poll interval. For coding agents whose tasks take minutes, 3s is fine.

Per-profile isolation (`~/.multica/profiles/<name>/`) lets multiple daemons run on the same host (prod + staging + dev worktrees) without colliding on PID files, config, workspace roots, or health port.

## Evidence

- `CLI_AND_DAEMON.md` "How It Works" and "Profiles" sections.
- `server/internal/daemon/daemon.go:86-135` — Run() lifecycle.
- `server/internal/daemon/daemon.go:115-124` — comment explaining zero-workspace startup.
