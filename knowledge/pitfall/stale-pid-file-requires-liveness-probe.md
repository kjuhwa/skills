---
version: 0.1.0-draft
name: stale-pid-file-requires-liveness-probe
summary: A daemon's PID file can outlive its process when the daemon crashes or is SIGKILLed; trust it only after probing the process with `kill(pid, 0)` which throws ESRCH if the process is gone.
category: pitfall
confidence: high
tags: [daemon, pid-file, liveness, crash-recovery]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/daemon/utils.ts
imported_at: 2026-04-18T00:00:00Z
---

# Stale PID File Needs Liveness Probe

## Context

A "is the daemon running?" check that only reads the PID file will give the wrong answer after a crash, a `kill -9`, or an OS reboot that left the file intact. The next CLI invocation refuses to auto-start because it thinks the daemon is up — and hangs trying to send to a dead socket.

## The fact / decision / pitfall

Always combine PID-file presence with a liveness probe. On POSIX:

```ts
export function isDaemonRunning(pid = getDaemonPid()): pid is number {
  if (pid) {
    try {
      process.kill(pid, 0); // signal 0 is a no-op: only tests whether the process exists / is accessible
      return true;
    } catch {
      // ESRCH = no such process, or EPERM = exists but not ours. Treat both as "not our daemon".
    }
  }
  return false;
}
```

Additional safety: when starting the daemon, delete the PID file *first* if it exists, even if `isDaemonRunning` returned false. That covers the race where two clients attempt auto-start concurrently.

On Windows, `process.kill(pid, 0)` still works via `OpenProcess`; the same probe is portable.

## Evidence

- `src/daemon/utils.ts::isDaemonRunning` — the exact pattern above.
- `src/daemon/client.ts::startDaemon` deletes `pidFilePath` if it exists right before spawning.
- `src/daemon/daemon.ts` checks `isDaemonRunning(pid)` at the top and `process.exit(1)` if another is already running.

## Implications

- Tests for "daemon already running" must simulate both a live daemon and a stale PID file; most test suites forget the second.
- If you're also `unlinkSync(socketPath)` on non-Windows before bind, that takes care of the stale socket file but not the stale PID file. Both clean-ups are required.
- On shutdown paths, always `unlinkSync(pidFilePath)` in your cleanup handler — otherwise the next startup has to detect and clean up the stale file on a fast path.
- For supervisors (systemd, launchd), the PID file is advisory — the supervisor already knows liveness. Skip the file entirely if you only ever run under a supervisor.
