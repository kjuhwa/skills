---
version: 0.1.0-draft
name: hermes-contextvars-session-identity
summary: Use ContextVars (not os.environ) for session identity when agent turns run concurrently in threads.
category: reference
tags: [contextvars, concurrency, session, python, thread-safety]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Session Identity via ContextVars (Not `os.environ`)

## The problem

An LLM agent gateway runs concurrent turns in `ThreadPoolExecutor` threads. Each turn belongs to a different session (user A's Telegram chat vs user B's Slack DM). If you store "current session key" in a process-global `os.environ` variable:

```python
os.environ["HERMES_SESSION_KEY"] = "telegram:alice"
agent.run_conversation(...)
del os.environ["HERMES_SESSION_KEY"]
```

...two concurrent turns race. User B's turn can observe User A's session key mid-approval check, causing the wrong session to receive an approval prompt.

## The fix — ContextVar with env fallback

```python
import contextvars

_approval_session_key: contextvars.ContextVar[str] = contextvars.ContextVar(
    "approval_session_key",
    default="",
)

def set_current_session_key(session_key: str) -> contextvars.Token[str]:
    return _approval_session_key.set(session_key or "")

def reset_current_session_key(token: contextvars.Token[str]) -> None:
    _approval_session_key.reset(token)

def get_current_session_key(default: str = "default") -> str:
    # Resolution order:
    # 1. approval-specific ContextVar (set by gateway before agent.run)
    # 2. session_context ContextVar (set by _set_session_env)
    # 3. os.environ fallback (CLI, cron, tests)
    session_key = _approval_session_key.get()
    if session_key:
        return session_key
    from gateway.session_context import get_session_env
    return get_session_env("HERMES_SESSION_KEY", default)
```

(`tools/approval.py:22-55`)

## Why this shape

- **ContextVars scope to the logical task, not the thread.** `ThreadPoolExecutor.submit()` with `loop.run_in_executor(..., copy_context().run, fn, ...)` carries the parent's ContextVars into the worker thread.
- **Env fallback keeps single-threaded callers working.** CLI, cron, tests that set `HERMES_SESSION_KEY=...` before spawning still work without code changes.
- **Token-based reset is mandatory.** `_approval_session_key.set(value)` returns a token; call `.reset(token)` in a `finally` block so leaving the scope restores the prior state, not the default.

## Gateway integration

```python
# gateway/run.py, before dispatching a turn
token = set_current_session_key(f"{platform}:{chat_id}")
try:
    result = await loop.run_in_executor(
        executor,
        contextvars.copy_context().run,   # <-- carries the ContextVar across
        agent.run_conversation, user_message,
    )
finally:
    reset_current_session_key(token)
```

The `copy_context().run` call is the key — without it, the worker thread sees the default value.

## Cron integration

Cron schedules a single job at a time per tick, so it's tempting to skip ContextVars. But a skill's "env passthrough" feature registers env vars as ContextVars, and those need to survive the hop into the worker that monitors inactivity timeout:

```python
_cron_context = contextvars.copy_context()
_cron_future = _cron_pool.submit(_cron_context.run, agent.run_conversation, prompt)
```

(`cron/scheduler.py:854-855`)

## Testing

Mock the ContextVar directly in tests — no monkey-patching `os.environ`:

```python
def test_session_key_isolated():
    from tools.approval import set_current_session_key, get_current_session_key
    token = set_current_session_key("test-session")
    try:
        assert get_current_session_key() == "test-session"
    finally:
        reset_current_session_key(token)
```

## When env vars are actually fine

- **Child process invocations.** If you spawn `subprocess.Popen(...)`, the only way to pass state is env. ContextVars don't cross process boundaries.
- **Module-level constants captured at import time.** These are single-threaded by definition.

## Reference

- `tools/approval.py:22-55` — per-session approval state via ContextVar
- `gateway/session_context.py` — session-scoped env wrapper
- `AGENTS.md` pitfall: "Don't use a process-global env var for session identity under concurrency"
