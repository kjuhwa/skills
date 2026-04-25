---
name: pid-watchdog-sidecar-survival
description: Make a Tauri sidecar self-terminate when the parent app exits (or optionally survive it) using parent-PID monitoring plus a filesystem sentinel.
category: tauri
version: 1.0.0
version_origin: extracted
tags: [tauri, sidecar, process-management, watchdog, windows]
source_type: extracted-from-git
source_url: https://github.com/jamiepine/voicebox.git
source_ref: main
source_commit: 476abe07fc2c1587f4b3e3916134018ebacd143d
source_project: voicebox
confidence: high
imported_at: 2026-04-18T00:00:00Z
---

# PID watchdog sidecar survival

## When to use
A Tauri desktop app launches a heavier backend (Python/Rust/Node) as a sidecar. The sidecar must (a) clean up when the user closes the app, but (b) optionally keep running when the user enables "remain running after close" so other local clients can still use it.

## Steps
1. Tauri passes `--parent-pid <pid>` when spawning the sidecar. The sidecar stores this and starts a background thread that polls "is parent alive?" every 2 s.
2. Use a cross-platform liveness probe. On Unix: `os.kill(pid, 0)`. On Windows: `OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION) + GetExitCodeProcess` — and treat `ACCESS_DENIED` as "alive" (the process exists, you just can't introspect it).
3. When the parent disappears, do NOT exit immediately. Sleep a grace period (~1 s) first so the Tauri `RunEvent::Exit` handler has a chance to deliver its "disable watchdog" signal. Race conditions on Windows are real.
4. Provide two disable paths, both checked during the grace period:
   - HTTP: expose `POST /watchdog/disable` that flips an in-process flag.
   - Filesystem sentinel: the Tauri app writes `<data_dir>/.keep-running` before exiting. The watchdog checks for this file after the grace period and consumes it (unlinks) if present.
5. The sentinel is the reliable path on Windows where process teardown frequently wins the race against the HTTP request. Emit both from the Tauri side (`RunEvent::Exit` handler) so whichever one lands keeps the sidecar alive.
6. On shutdown, use `os._exit(0)` on Windows (so uvicorn-style shutdown hooks can run on ReadyRequest) and `os.kill(os.getpid(), SIGTERM)` on Unix.
7. Clear any stale sentinel on startup. If the previous session's HTTP-disable won the race but then the sidecar crashed, the sentinel is left on disk and would spuriously extend the next session.

## Counter / Caveats
- On Unix also `signal(SIGHUP, SIG_IGN)` when disabling the watchdog. Otherwise the sidecar dies of SIGHUP when the parent's session leader exits, even though your watchdog never tripped.
- Windows `TerminateProcess` (which is what `os.kill(SIGTERM)` becomes) hard-kills without shutdown handlers. On Windows prefer `os._exit(0)` inside a SIGINT-like path, or graceful `/shutdown` via HTTP first.
- Do not rely on the HTTP request alone; the sentinel file is the fallback that makes the feature production-reliable.
- Always consume (unlink) the sentinel once its signal has been used — otherwise the next session starts with a stale "keep running" request.

Source references: `backend/server.py` (`_start_parent_watchdog`, `disable_watchdog`), `tauri/src-tauri/src/main.rs` (`RunEvent::Exit` handler, `set_keep_server_running`, `.keep-running` sentinel).
