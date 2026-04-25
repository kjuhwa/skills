---
version: 0.1.0-draft
name: hermes-cross-platform-file-lock
summary: Cross-platform file locking pattern — fcntl on Unix, msvcrt on Windows, with non-blocking exclusive acquire.
category: engineering
tags: [file-lock, fcntl, msvcrt, cross-platform, concurrency]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Cross-Platform File Lock (Unix + Windows)

Hermes' cron tick uses a file lock so multiple processes (gateway's in-process ticker, a standalone daemon, a systemd timer, a manual user run) can't double-fire jobs. The lock must work on Linux, macOS, WSL2, and native Windows.

## Import guard

```python
try:
    import fcntl
except ImportError:
    fcntl = None
    try:
        import msvcrt
    except ImportError:
        msvcrt = None
```

(`cron/scheduler.py:20-28`)

`fcntl` is Unix-only; `msvcrt` is Windows-only. On a platform with neither (rare), both are `None` and the code should degrade gracefully (no lock — accept the race, or refuse to run).

## Acquire — non-blocking exclusive

```python
lock_fd = None
try:
    lock_fd = open(LOCK_FILE, "w")
    if fcntl:
        fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    elif msvcrt:
        msvcrt.locking(lock_fd.fileno(), msvcrt.LK_NBLCK, 1)
except (OSError, IOError):
    logger.debug("Tick skipped — another instance holds the lock")
    if lock_fd is not None:
        lock_fd.close()
    return 0
```

Non-blocking is important: if another instance is running the tick, we want to skip, not queue. `LOCK_NB` / `LK_NBLCK` raise immediately if the lock is held.

## Work under the lock

```python
try:
    # ... do protected work ...
    return executed
finally:
    if fcntl:
        fcntl.flock(lock_fd, fcntl.LOCK_UN)
    elif msvcrt:
        try:
            msvcrt.locking(lock_fd.fileno(), msvcrt.LK_UNLCK, 1)
        except (OSError, IOError):
            pass
    lock_fd.close()
```

The `finally` block is essential — a crash inside the protected block must release the lock so the next invocation works.

## `msvcrt.locking` quirks

- Locks exactly **1 byte** starting at the current file position (hence the `, 1` at the end).
- The lock is released automatically when the handle is closed — but explicit unlock is more predictable.
- Re-locking from the same process is not always allowed (no recursion). Design the protected region to be a single enter/exit.

## `fcntl.flock` vs `fcntl.lockf`

`flock` is whole-file and less subtle; `lockf` supports byte ranges but has confusing `close()` semantics (locks on any fd to the same file are released when *any* of them closes). For "only one ticker at a time", `flock` is right.

## File location

Keep the lock file in the app's state directory so it's auto-cleaned with the state:

```python
_LOCK_DIR = get_hermes_home() / "cron"
_LOCK_FILE = _LOCK_DIR / ".tick.lock"
_LOCK_DIR.mkdir(parents=True, exist_ok=True)
```

A leading dot keeps it out of skim listings. Don't put it in `/tmp` — that's globally shared, and a stale lock from another user can block yours.

## Don't use for mutex-across-machines

File locks are machine-local. If your ticker could run on multiple hosts (e.g. two replicas sharing a network mount), use a proper distributed lock (Redis SETNX with TTL, etcd, etc.). File locks on NFS are infamously unreliable.

## Reference

- `cron/scheduler.py:986-1082` — full tick-with-lock implementation
- Python docs: `fcntl.flock`, `msvcrt.locking`
