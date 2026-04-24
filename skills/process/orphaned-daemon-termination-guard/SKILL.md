---
name: orphaned-daemon-termination-guard
description: Kill an orphaned background daemon when no non-daemon sibling process is alive. Prevents LevelDB/file lock contention after unclean parent shutdown. Pattern: scan for daemon PIDs, then check if any non-daemon parent process exists before killing.
category: process
version: 1.0.0
tags: [daemon, orphan, process, bash, leveldb, lock, cleanup, startup]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origins: extracted
confidence: high
---

# Orphaned Daemon Termination Guard

## When to use

Use this pattern in an application launcher when:
- Your application spawns a background daemon process (e.g., a helper service, IPC daemon, or storage worker).
- The main application process can crash or be killed ungracefully, leaving the daemon running without its parent.
- The orphaned daemon holds file locks (e.g., LevelDB, SQLite, filesystem locks) that prevent a clean restart of the application.
- You want to automatically detect and kill the orphaned daemon on next launch, before any lock-sensitive operations.

## Pattern

```
On application launch:
1. Check if daemon process(es) exist (pgrep by process name/pattern)
2. If daemon found:
   a. Check if any non-daemon application process is running
   b. If non-daemon process found → daemon is normal, leave it alone
   c. If no non-daemon process found → daemon is orphaned, kill it
3. Continue with lock cleanup and application launch
```

### Ordering matters

This cleanup must run BEFORE other lock cleanup steps (e.g., `cleanup_stale_lock`, `cleanup_stale_socket`) because:
- The orphaned daemon may still be writing to lock files.
- Removing locks while the daemon is still running can cause the daemon to crash with data corruption.
- Kill the daemon first, then clean up any files it left behind.

## Minimal example

```bash
#!/usr/bin/env bash

# Kill orphaned daemon processes when the main application is not running.
# Must be called BEFORE cleanup_stale_lock and cleanup_stale_socket.
#
# Customise:
#   DAEMON_PATTERN   — pattern matching the daemon's cmdline (for pgrep -f)
#   PARENT_PATTERN   — pattern matching the main app's cmdline (for pgrep -f)
#   DAEMON_EXCLUDE   — string that daemon's cmdline contains (to filter it out
#                      when scanning for non-daemon parent processes)
cleanup_orphaned_daemon() {
    local daemon_pattern="my-daemon-service\.js"
    local parent_pattern="my-application"
    local daemon_exclude="my-daemon-service"

    # Step 1: find daemon PIDs
    local daemon_pids
    daemon_pids=$(pgrep -f "$daemon_pattern" 2>/dev/null) || return 0
    # If no daemon is running, nothing to do
    [[ -n $daemon_pids ]] || return 0

    # Step 2: check if any non-daemon application process is alive
    local pid cmdline
    for pid in $(pgrep -f "$parent_pattern" 2>/dev/null); do
        # Read the process's full command line
        cmdline=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null) || continue
        # Skip processes that ARE the daemon
        [[ $cmdline == *"$daemon_exclude"* ]] && continue
        # Found a non-daemon application process — daemon is NOT orphaned
        return 0
    done

    # Step 3: no non-daemon application process found — daemon is orphaned
    for pid in $daemon_pids; do
        kill "$pid" 2>/dev/null || true
    done
    log_message "Killed orphaned daemon (PIDs: $daemon_pids)"
}

# Usage in launcher (order matters):
setup_logging
cleanup_orphaned_daemon      # must be FIRST
cleanup_stale_lock           # then clean up any stale locks
cleanup_stale_socket         # then clean up stale IPC sockets
exec "$app_exec" "${app_args[@]}" "$@"
```

## Why this works

### `pgrep -f` matches against full command line

`pgrep -f PATTERN` matches against the full command line string (program name + all arguments), not just the process name. This is needed when the daemon is a script interpreter (e.g., `node /path/to/my-daemon-service.js`) where the process name is `node`, not `my-daemon-service`. The pattern must be specific enough to avoid matching unrelated processes.

### `/proc/$pid/cmdline` with `tr '\0' ' '`

`/proc/$pid/cmdline` contains the process arguments separated by null bytes (`\0`). Reading it directly and converting null bytes to spaces produces a readable string suitable for `[[ $cmdline == *pattern* ]]` matching. Using `cat /proc/$pid/cmdline` directly would truncate at the first null byte.

### Filtering the daemon itself during non-daemon check

`pgrep -f parent_pattern` may return the daemon's own PID if the parent pattern also matches part of the daemon's command line. The `[[ $cmdline == *"$daemon_exclude"* ]] && continue` line skips daemon processes to avoid treating the daemon as its own parent.

### Kill with `2>/dev/null || true`

`kill PID` fails silently if the process has already exited between `pgrep` and `kill`. Using `2>/dev/null || true` prevents error output and ensures the loop continues for all remaining PIDs even if one has already exited.

### LevelDB lock contention scenario

LevelDB maintains a `LOCK` file in its data directory. Only one process can hold this lock. If the orphaned daemon holds it, a new application instance cannot open the database and silently quits (or crashes with "Another process holds the lock" error). Killing the daemon releases the lock, allowing the new instance to start correctly.

## Pitfalls

- **Pattern specificity** — `DAEMON_PATTERN` must be specific enough to only match the target daemon. A too-broad pattern (e.g., just `node`) will kill unrelated Node.js processes. Test with `pgrep -f pattern -l` to see what it matches.
- **Race condition on fast restart** — if the user restarts the application very quickly after a crash, the new instance may kill the daemon before it has finished writing state to disk. Add a brief check (e.g., verify the daemon's socket is not responsive) before killing if data integrity is critical.
- **`SIGTERM` vs `SIGKILL`** — `kill PID` sends SIGTERM. The daemon may handle SIGTERM gracefully (flushing writes, releasing locks). If the daemon ignores SIGTERM, use `kill -9 PID` (SIGKILL), but be aware this prevents graceful cleanup.
- **Multi-user systems** — `pgrep -f` finds processes owned by the current user. On a shared system, another user's daemon would not be found. This is correct behavior — do not kill other users' processes.
- **`/proc` availability** — `/proc/PID/cmdline` is Linux-specific. On macOS or BSD, use `ps -o command= -p $pid` instead.

## Source reference

`scripts/launcher-common.sh` — `cleanup_orphaned_cowork_daemon()` function
