---
version: 0.1.0-draft
name: daemon-per-profile-isolation
summary: Multiple daemon profiles on one host — production, staging, dev worktrees — each with its own config dir, PID, health port, and workspace root.
category: arch
tags: [cli, daemon, profiles, isolation, multi-env]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLI_AND_DAEMON.md
imported_at: 2026-04-18T00:00:00Z
---

Each profile gets a fully isolated per-profile directory under `~/.multica/profiles/<name>/` containing:
- `config.json` (server URL, token, watched workspaces)
- Daemon PID file and lock
- Health check port (base + hash offset, to avoid collisions)
- Workspace root (`~/multica_workspaces_<profile>/`)

Developers can run the production daemon, a staging daemon, and N dev-worktree daemons concurrently without config collisions. The desktop app also uses this mechanism: it spawns its own `desktop-<host>-<port>` profile so launching the Electron app doesn't clobber the user's system CLI config.

Profile-name derivation for worktrees is deterministic:

```bash
WORKTREE_DIR="$(basename "$PWD")"
SLUG="$(printf '%s' "$WORKTREE_DIR" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g; s/__*/_/g; s/^_//; s/_$//')"
HASH="$(printf '%s' "$PWD" | cksum | awk '{print $1}')"
OFFSET=$((HASH % 1000))
PROFILE="dev-${SLUG}-${OFFSET}"
```

## Why

Without isolation, launching a local dev daemon would silently point the user's terminal `multica` at localhost instead of production. After hours of debugging why your "production" issue updates aren't saving, you'd find them all on localhost. Per-profile config removes that class of foot-gun.

## Evidence

- `CLI_AND_DAEMON.md` "Profiles" section.
- `CONTRIBUTING.md:331-347` — profile-naming formula for worktree isolation.
- `CONTRIBUTING.md:493-503` — isolation guarantee table.
