---
version: 0.1.0-draft
name: scheduler-and-cron-task-execution-model
summary: File-based lightweight cron alternative — JSON task definitions, report-timestamp cooldown tracking, health-check introspection, max-delay guardrails.
category: automation
tags: [automation, scheduling, cron-alternative, file-based, agents]
source_type: extracted-from-git
source_url: https://github.com/lsdefine/GenericAgent.git
source_ref: main
source_commit: ec34b7e1c0f11fbb9709680ccfe313187a1b942b
source_project: GenericAgent
source_path: memory/scheduled_task_sop.md
imported_at: 2026-04-18T00:00:00Z
confidence: medium
---

# Scheduler and cron task execution model

Design pattern for a lightweight file-based scheduler suitable for driving scheduled work in an agent framework or similar environment where installing systemd/cron would be overkill or impossible (Windows user account, Docker container without cron, etc.).

## Directory layout

```
sche_tasks/
├── *.json              ← task definitions (one file per scheduled task)
├── done/
│   └── YYYY-MM-DD_task-name.md   ← per-run reports; existence doubles as "ran today"
└── scheduler.log       ← scheduler lifecycle + trigger/skip/error events
```

`done/` serves double duty: it's the report archive AND the cooldown source of truth. The scheduler asks "did this task already run in its current window?" by looking at the newest report file's timestamp for that task. No database, no in-memory state — all durable.

## Task definition schema

```json
{
  "schedule": "08:00",
  "repeat": "daily",
  "enabled": true,
  "prompt": "...",
  "max_delay_hours": 6
}
```

| Field | Purpose |
|---|---|
| `schedule` | When to fire. Time-of-day for daily-ish types; ISO for `once` |
| `repeat` | `daily` / `weekday` / `weekly` / `monthly` / `once` / `every_Nh` / `every_Nd` |
| `enabled` | Hard kill-switch; `false` means never fire, but the task file stays for history |
| `prompt` | The payload handed to whatever worker executes the task (often an LLM-agent prompt) |
| `max_delay_hours` | How late the task may fire past its nominal time before being silently skipped (default 6) |

`max_delay_hours` is the small detail that matters: if the user turned the machine off overnight and boots it at 10am, a daily-08:00 task doesn't pile up and fire immediately. With `max_delay_hours: 6`, it fires as normal (10am is within window). With `max_delay_hours: 1`, it's silently skipped and waits for tomorrow — no more stale "good morning" tasks popping at dinner.

## Trigger loop

```
every 60 seconds:
  for each *.json in sche_tasks/:
    load task
    if not task.enabled: skip
    if now < task.schedule_next_fire_time: skip
    if now > task.schedule + max_delay_hours: skip + log "stale, waiting for next window"
    if newest report for this task within cooldown window: skip + log "already ran"
    → FIRE (build prompt with injected report path, dispatch to worker)
```

60 seconds is a reasonable poll interval: short enough that an 08:00 task fires by 08:01 on most systems, long enough that the scheduler is nearly free.

## Report-path injection

The scheduler generates the report path and injects it into the prompt:

```
... original prompt text ...

Please write your report to:
  sche_tasks/done/2026-04-18_daily-digest.md
```

The worker agent now has a contract: finish the task AND write the report to this exact path. The scheduler uses the file's *existence and mtime* to determine cooldown status. No IPC, no status message — presence of the file IS the completion signal.

### First-thing checkpoint rule

The worker's **first** action on receiving the task should be to update its durable working-checkpoint with the report path. This prevents long tasks from losing track of where they were supposed to write — if the worker crashes halfway through, the next session's recovery can see "oh, I was supposed to write to X; that file doesn't exist; I haven't finished yet."

## Health-check introspection

```python
scheduler.health_check()
# → [
#     {"name": "daily-digest", "status": "HEALTHY", "last_run": "2026-04-17T08:03:12"},
#     {"name": "weekly-tidy",  "status": "OVERDUE", "last_run": "2026-04-01T09:00:00"},
#     {"name": "experimental", "status": "DISABLED"},
#     {"name": "once-upgrade", "status": "NEVER_RUN"},
#     {"name": "broken-task",  "status": "ERROR", "reason": "bad schedule format"},
#   ]
```

Five states — HEALTHY, OVERDUE, DISABLED, NEVER_RUN, ERROR — surface in one call. Useful for:

- Dashboard rendering ("what's red").
- Startup sanity check ("after a long absence, what needs attention?").
- Alerting ("any ERROR state pages oncall").

## Logged events

The `scheduler.log` records:

- **trigger**: task about to run, with injected prompt path
- **skip**: reason (disabled / in cooldown / past max_delay / stale window)
- **error**: JSON parse failure, bad schedule format, unknown repeat type, worker invocation failure
- **startup/shutdown**: for debugging lifecycle

A tight log format means grepping `scheduler.log | grep ERROR` is enough for most triage.

## `once` type: effectively-permanent cooldown

`repeat: "once"` is implemented by setting the cooldown to 100 years after first run. The task file remains (for history) but never fires again. To re-arm, either delete the last report file or set `enabled: false` then replace the JSON.

## Why file-based beats in-memory for this class of problem

1. **Restart-resilient.** The scheduler process can crash, be upgraded, be rebooted — next startup reads the same task files, knows the same history, keeps running.
2. **Human-editable.** A user can disable a task by editing one JSON; a user can rerun by deleting one report file. No admin CLI needed.
3. **Audit-friendly.** The done/ directory *is* the audit trail. No separate log correlation.
4. **Cheap.** 60-second polling across a dozen JSON files is sub-millisecond CPU.

## When this pattern breaks down

- **High cardinality** (hundreds of tasks) — the directory scan per poll is still cheap, but human management becomes untenable. Switch to a database.
- **Sub-minute precision** — 60-second polling can't do that; drop interval or use OS-level scheduling.
- **Distributed scheduling** (multiple hosts) — file-based races on shared storage; add locking or switch to a proper job queue.

## Related

- Pairs well with `autonomous-operation-principles-for-unattended-agents` (knowledge) — the scheduler is the driver for autonomous sessions.

---

Reference extracted from GenericAgent's `scheduled_task_sop.md`. Chinese-language original; translated.
