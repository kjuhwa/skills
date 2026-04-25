---
name: hermes-cron-agent-scheduler
description: Run an LLM agent on a cron schedule with inactivity timeout, silent marker, and cross-platform delivery.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [llm-agents, cron, scheduling, delivery, timeout]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Cron-Driven LLM Agent with Inactivity Timeout

## Context

Scheduled LLM agents (daily reports, nightly audits) have two failure modes that naive `timeout()` wrappers miss: (1) a long tool call is legitimate and should not count as "stuck", and (2) an empty model response should not look like a successful run.

Hermes' cron path solves both, plus adds platform-agnostic delivery and a `[SILENT]` marker the agent can emit to suppress delivery when there's nothing to report.

## When to use

- Building a cron/scheduler layer that invokes an LLM agent.
- Agent runs can take minutes (browser work, long test suites).
- Delivery happens across multiple channels (Telegram, Slack, Discord, email, SMS, webhook).
- You want the agent itself to decide "nothing to say today".

## Procedure

### 1. Advance next_run BEFORE executing

To avoid crash-loop re-fire, update the job's `next_run_at` before you start the agent, not after. See `cron/scheduler.py:1028-1034`:

```python
for job in due_jobs:
    advance_next_run(job["id"])   # future run already scheduled
    success, output, final_response, error = run_job(job)
```

Keep one-shot jobs one-shot by only advancing recurring jobs.

### 2. File-lock the tick so overlapping instances don't double-fire

`tick()` takes an exclusive file lock (`fcntl.flock` on Unix, `msvcrt.locking` on Windows) so gateway + daemon + systemd-timer overlap is safe. Skipped ticks return `0` silently (`cron/scheduler.py:1001-1082`).

### 3. Drive the agent with an **inactivity** timeout, not a wall-clock one

A 2-hour compilation is not "stuck". Hermes polls the agent's `get_activity_summary()` and only aborts when `seconds_since_activity` exceeds the limit:

```python
_cron_inactivity_limit = float(os.getenv("HERMES_CRON_TIMEOUT", 600))
_cron_pool = concurrent.futures.ThreadPoolExecutor(max_workers=1)
_cron_context = contextvars.copy_context()  # preserve ContextVars
_cron_future = _cron_pool.submit(_cron_context.run, agent.run_conversation, prompt)

while True:
    done, _ = concurrent.futures.wait({_cron_future}, timeout=5.0)
    if done:
        result = _cron_future.result()
        break
    idle_secs = agent.get_activity_summary().get("seconds_since_activity", 0.0)
    if idle_secs >= _cron_inactivity_limit:
        agent.interrupt("Cron job timed out (inactivity)")
        raise TimeoutError(...)
```

`contextvars.copy_context()` is essential — without it, any skill-declared env passthrough or session-context propagation set in the scheduler thread gets lost in the worker. See `cron/scheduler.py:850-914`.

### 4. Signal "nothing to report" via a sentinel

The scheduler prepends a system hint to every cron prompt:

> "SILENT: If there is genuinely nothing new to report, respond with exactly `[SILENT]` (nothing else) to suppress delivery. Never combine [SILENT] with content."

After the run, the scheduler checks for the marker and suppresses delivery while still saving the output locally for audit (`cron/scheduler.py:600-612`, `1045-1049`).

### 5. Validate script paths for pre-run data collection

Jobs can declare `script:` to run a data-collection script before the LLM call. Hermes forces the script inside `HERMES_HOME/scripts/` via `Path.resolve() + relative_to()` to block path traversal, and also redacts secrets from stdout/stderr with `redact_sensitive_text()` before the output enters the prompt (`cron/scheduler.py:486-564`).

### 6. Delivery: live adapter first, standalone fallback

If the gateway is running, prefer its live adapter (supports E2EE rooms like Matrix). Otherwise spin up a fresh `asyncio.run()` in a worker thread:

```python
runtime_adapter = (adapters or {}).get(platform)
if runtime_adapter is not None and loop is not None and loop.is_running():
    future = asyncio.run_coroutine_threadsafe(runtime_adapter.send(...), loop)
    future.result(timeout=60)
else:
    # asyncio.run() + close-coro-on-RuntimeError fallback
    try:
        asyncio.run(coro)
    except RuntimeError:
        coro.close()
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(asyncio.run, _send_to_platform(...))
            future.result(timeout=30)
```

See `cron/scheduler.py:370-445`.

### 7. Treat empty response as soft failure

If the model completes but returns nothing, don't mark the job "ok" — that hides silent misconfiguration:

```python
if success and not final_response:
    success = False
    error = "Agent completed but produced empty response..."
```

(`cron/scheduler.py:1062-1065`)

### 8. Disable toolsets the agent shouldn't have in cron context

```python
agent = AIAgent(
    ...,
    disabled_toolsets=["cronjob", "messaging", "clarify"],
    skip_context_files=True,  # no SOUL.md/AGENTS.md injection
    skip_memory=True,          # don't let cron corrupt user memory
    platform="cron",
)
```

`skip_memory=True` prevents the scheduled prompt from being written back into persistent user-memory files.

## Pitfalls

- **Don't use a wall-clock timeout.** A 20-minute pip install or 2-hour dataset download will be killed even though the agent is making progress.
- **Don't forget `contextvars.copy_context()` around the worker submit** — ContextVars don't cross thread boundaries automatically.
- **Clean up injected env vars in a `finally` block** so `HERMES_CRON_AUTO_DELIVER_*` etc. don't leak into the next job.
- **Validate platform names against an allowlist** (`_KNOWN_DELIVERY_PLATFORMS`) to prevent env-var enumeration via crafted `deliver:` values.
