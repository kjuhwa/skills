---
version: 0.1.0-draft
name: electron-singleton-lock-race-condition
summary: Electron's `requestSingleInstanceLock` uses a LevelDB-backed symlink with a PID target; if the previous process exited uncleanly, the symlink remains pointing at a dead PID, causing subsequent launches to silently quit without any error message.
category: electron-packaging
tags: [electron, singleton-lock, leveldb, race-condition, stale-lock, linux, launcher]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: medium
---

# Electron Singleton Lock Race Condition

## Context

Electron apps use `app.requestSingleInstanceLock()` to prevent multiple
instances from running simultaneously. On Linux, this is implemented via
a `SingletonLock` file in the app's user data directory (`~/.config/AppName/`).
When a second instance launches and finds the lock, it silently quits and
signals the first instance instead.

If the first instance crashes or is killed without cleanup (e.g., `kill -9`,
OOM killer, system crash), the lock file is left behind with its content
pointing at a now-dead PID.

## Observation

The `SingletonLock` file is a symlink whose target encodes the hostname and
PID of the owning process (e.g.,
`hostname-machine.local-1234567890` where `1234567890` is the PID).

When a new instance launches and reads the lock, Electron checks if the PID
in the symlink target is still alive. On Linux, this check can fail silently
in some conditions, or the PID may have been reused by a different process,
making the alive-check a false positive.

The net result: after a crash or forced kill, the app silently exits on the
next launch with no error dialog, log entry, or user feedback. From the user's
perspective, clicking the app icon does nothing.

The `--doctor` diagnostic check explicitly looks for a stale lock file and
reports it.

## Why it happens

`SingletonLock` is created by Chromium's cross-platform singleton lock
mechanism. On Linux it uses a symlink because creating a symlink is an atomic
operation that cannot collide (unlike creating a regular file). The symlink
target encodes the PID so the owning process can be verified.

On unclean exit (SIGKILL, crash, power loss), the symlink is not removed.
Electron's PID check may fail to detect that the PID is stale if:
- The PID was reused by another process in the interval.
- The check implementation has a race (check exists then check alive).
- The hostname in the symlink target matches but the PID resolution is wrong.

## Practical implication

Add a stale lock cleanup step to the app launcher, before starting Electron:

```bash
cleanup_stale_lock() {
  local lock_file="${XDG_CONFIG_HOME:-$HOME/.config}/AppName/SingletonLock"

  if [[ ! -L "$lock_file" ]]; then
    return 0  # No lock, nothing to do
  fi

  # Read the lock target to extract the PID
  local lock_target
  lock_target=$(readlink "$lock_file" 2>/dev/null) || return 0
  local lock_pid
  lock_pid=$(echo "$lock_target" | grep -oE '[0-9]+$')

  if [[ -n "$lock_pid" && ! -d "/proc/$lock_pid" ]]; then
    # PID is dead — lock is stale
    log_message "Removing stale SingletonLock (dead PID $lock_pid)"
    rm -f "$lock_file"
  fi
}
```

Also implement a `--doctor` check that detects and reports the stale lock
with a suggested fix command.

Note: removing a valid lock (one owned by a running instance) is incorrect
and would allow two instances to start simultaneously. Only remove the lock
if `/proc/<pid>` does not exist.

## Source reference

- `CLAUDE.md`: "Useful Locations" section — lists `SingletonLock` path.
- `CLAUDE.md`: "Common Gotchas" — "If app won't start, check for stale lock."
- `docs/TROUBLESHOOTING.md`: `--doctor` check table — "SingletonLock: Stale
  lock file detection."
