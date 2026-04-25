---
version: 0.1.0-draft
name: daemon-pid-stored-in-runtime-not-config
summary: Daemon PID files belong in runtime-scratch directories (`$XDG_RUNTIME_DIR`, `/tmp/<app>-<uid>`, `%TMPDIR%/app`), not in user config dirs, because the file must be cleared on reboot but most config dirs persist.
category: pitfall
confidence: medium
tags: [daemon, pid-file, runtime-dir, xdg, macos]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/daemon/utils.ts
imported_at: 2026-04-18T00:00:00Z
---

# PID Files Belong in Runtime Dirs

## Context

Daemon processes write a PID file so other processes can discover them. The file must vanish on reboot (different kernel = different PID numbers, so a stale PID file becomes a misidentification risk). This is handled for you if you use the right directory.

## The fact / decision / pitfall

Use the platform-appropriate runtime directory:

- **Linux**: `$XDG_RUNTIME_DIR/<app>/daemon.pid` (cleared on logout). Falls back to `/tmp/<app>-<uid>/daemon.pid` (cleared on boot).
- **macOS**: `$XDG_RUNTIME_DIR` is sometimes set (e.g. by tmux); otherwise use `/tmp/<app>-<uid>/`. `/tmp` on macOS is a BSD-style cleared-on-boot mount.
- **Windows**: `os.tmpdir()/<app>/daemon.pid` — `%TEMP%` is not auto-cleared but Windows regenerates PIDs reliably across reboots so stale files are merely advisory.

Do *not* use `$XDG_DATA_HOME`, `$XDG_CONFIG_HOME`, `~/Library/Application Support`, or `%APPDATA%` — these all persist across reboots and can leave stale PID files pointing at a valid-but-unrelated process.

Wrap the PID-file presence in a liveness probe (`process.kill(pid, 0)`) anyway — belt-and-suspenders.

## Evidence

- `src/daemon/utils.ts::getRuntimeHome()` — tries `XDG_RUNTIME_DIR` first, `/tmp/<app>-<uid>` on macOS/Linux, `os.tmpdir()` on Windows.
- Telemetry's `FilePersistence` uses `~/Library/Application Support` on macOS — that's correct *for persistent state*, not for PIDs.

## Implications

- Config state (settings, tokens, logs you want to keep) and runtime state (PIDs, sockets, per-session temp files) go in different places. Don't merge the two.
- On Linux without `XDG_RUNTIME_DIR` (older distros), your PID file lives in `/tmp`. Make sure your app name is uid-suffixed so multi-user systems don't collide.
- PID files should be text, not binary — store as decimal string for easy debugging (`cat /tmp/myapp-1000/daemon.pid`).
- When migrating state between runs, copy *config* across; leave *runtime* alone. Users who delete `~/.cache/myapp` shouldn't see a broken daemon afterward.
