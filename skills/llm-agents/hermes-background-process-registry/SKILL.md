---
name: hermes-background-process-registry
description: Track LLM-spawned background processes with rolling output buffers, watch patterns, PTY support, and crash recovery.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [llm-agents, background-process, terminal, pty, checkpoint]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Background Process Registry for Agent Terminals

## Context

When an LLM can call `terminal(background=true)`, you need a tracker that (a) captures rolling output without exploding memory, (b) survives the agent process restarting, (c) lets the agent wait/poll/kill without re-attaching to pipes, and (d) notifies the agent when output matches a pattern.

Hermes' `ProcessRegistry` (in `tools/process_registry.py`) is a compact ~1200-line implementation you can port.

## When to use

- Your agent can launch long-running commands (`pytest`, `npm run dev`, training jobs).
- You need status polls, stdin writes, and safe kill semantics from the same tool call surface.
- You want completion + pattern-match notifications to re-trigger the agent.

## Procedure

### 1. One `ProcessSession` dataclass holds everything

```python
@dataclass
class ProcessSession:
    id: str                                     # "proc_xxxxxxxxxxxx"
    command: str
    task_id: str = ""                           # isolates children / delegates
    session_key: str = ""                       # gateway session scope
    pid: Optional[int] = None
    process: Optional[subprocess.Popen] = None
    started_at: float = 0.0
    exited: bool = False
    exit_code: Optional[int] = None
    output_buffer: str = ""                     # rolling 200KB window
    max_output_chars: int = 200_000
    detached: bool = False                       # recovered from crash
    pid_scope: str = "host"                      # or "sandbox"
    watch_patterns: List[str] = field(default_factory=list)
    notify_on_complete: bool = False
    _lock: threading.Lock = field(default_factory=threading.Lock)
    _pty: Any = field(default=None)
```

(`tools/process_registry.py:78-115`)

### 2. Two spawn paths: local vs sandbox

**Local** uses `subprocess.Popen` with `os.setsid` (so kill-group works) and `PYTHONUNBUFFERED=1` (so `tqdm`/`datasets` don't hide output through a pipe). Optional PTY path via `ptyprocess` / `winpty` for interactive CLIs (Claude Code, Codex, REPLs) — see `spawn_local()` at `tools/process_registry.py:309-419`.

**Sandbox** (Docker/Modal/Daytona/SSH) can't keep a live pipe, so Hermes writes a shell wrapper that:

```sh
mkdir -p /tmp && ( nohup bash -lc "$cmd" > /tmp/hermes_bg_$id.log 2>&1; \
  rc=$?; printf '%s\n' "$rc" > /tmp/hermes_bg_$id.exit ) & \
  echo $! > /tmp/hermes_bg_$id.pid && cat /tmp/hermes_bg_$id.pid
```

and then polls the log file every 2 seconds via `env.execute(cat ...)` (`spawn_via_env()`, `_env_poller_loop()` at lines 421-582).

### 3. Rolling output buffer — drop from the head, not trim on read

```python
with session._lock:
    session.output_buffer += chunk
    if len(session.output_buffer) > session.max_output_chars:
        session.output_buffer = session.output_buffer[-session.max_output_chars:]
```

This keeps the *most recent* output (which is what agents care about), at a bounded cost per chunk. Strip shell startup noise from the first chunk only (`_clean_shell_noise()`), not every chunk.

### 4. Watch patterns with rate-limit-and-kill

Pattern matches trigger agent notifications — but a tight loop can flood them. Hermes rate-limits to 8 matches per 10s window; sustained overload for 45s permanently disables watch for that process with a "watch_disabled" notification:

```python
WATCH_MAX_PER_WINDOW = 8
WATCH_WINDOW_SECONDS = 10
WATCH_OVERLOAD_KILL_SECONDS = 45
```

See `_check_watch_patterns()` at `tools/process_registry.py:162-250`.

### 5. Unified completion queue

One `queue.Queue` receives both completion and watch-match events, distinguished by a `"type"` field. CLI and gateway both drain it after each agent turn and synthesize a new `[SYSTEM: ...]` message. Guard against duplicate completion via `_move_to_finished()` idempotency (`tools/process_registry.py:615-639`).

### 6. Crash recovery checkpoint

Persist running-process metadata atomically to `~/.hermes/processes.json` on every spawn/kill/move-to-finished. On restart:

```python
def recover_from_checkpoint(self) -> int:
    for entry in entries:
        pid = entry.get("pid")
        if entry.get("pid_scope") != "host":
            continue  # sandbox PIDs are meaningless on restart
        if self._is_host_pid_alive(pid):
            session = ProcessSession(..., detached=True)
            self._running[session.id] = session
            recovered += 1
```

Detached sessions can still be polled for liveness and killed via `os.kill(pid, SIGTERM)`, but their output buffer is empty (no pipe to re-attach).

### 7. Wait with bounded + interruptible polling

`wait()` blocks up to `TERMINAL_TIMEOUT` (default 180s), clamping user requests to that ceiling and returning a `timeout_note`. It checks `_is_interrupted()` each iteration so a new user message breaks the wait immediately (`tools/process_registry.py:711-782`).

### 8. Kill: process group on Unix, terminate on Windows

```python
if _IS_WINDOWS:
    session.process.terminate()
else:
    os.killpg(os.getpgid(session.process.pid), signal.SIGTERM)
```

Killing the process *group* (because the spawn used `os.setsid`) gets shell-spawned children, not just the shell itself. This is what makes `terminal("npm test")` cancellable when `npm` has spawned `jest` workers.

## Pitfalls

- **Forgetting `os.setsid` / `setpgrp`** means `kill` only gets the shell, not the real workload.
- **Unbounded output_buffer** is the #1 memory leak source for agent framework. Always cap with trim-from-head.
- **Keeping sandbox PIDs in the checkpoint** is useless — on restart you can't reach them. Mark `pid_scope="sandbox"` and skip at recovery time.
- **Atomic checkpoint writes are mandatory.** A half-written JSON after crash causes recovery to silently orphan processes.
- **PTY first-chunk noise** (`bash: no job control in this shell`) must be stripped only from the first chunk — matching on later output would hide real content.
