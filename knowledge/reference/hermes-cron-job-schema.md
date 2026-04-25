---
version: 0.1.0-draft
name: hermes-cron-job-schema
summary: JSON schema for agent-scheduled jobs — recurrence, delivery, pre-run scripts, skill invocation.
category: reference
tags: [cron, schema, scheduling, llm-agents, delivery]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Hermes Cron Job JSON Schema

Jobs are stored in `~/.hermes/cron/jobs.json` (see `cron/jobs.py`) with the following shape per entry.

## Canonical fields

```json
{
  "id": "job_abc123",
  "name": "daily-standup",
  "prompt": "Summarize yesterday's git commits for @me.",
  "schedule": "0 9 * * *",
  "schedule_display": "Every day at 09:00 UTC",
  "next_run_at": 1745220000,
  "last_run_at": 1745133600,
  "last_status": "ok",
  "last_error": null,
  "last_delivery_error": null,

  "deliver": "telegram",
  "origin": {
    "platform": "telegram",
    "chat_id": "-1001234",
    "chat_name": "Team DMs",
    "thread_id": null
  },

  "model": "anthropic/claude-opus-4.6",
  "provider": "anthropic",
  "base_url": null,

  "skills": ["git-daily-summary"],
  "skill": "git-daily-summary",

  "script": "collect_commits.py",

  "disabled_toolsets": null,
  "max_turns": null,

  "created_at": 1745000000
}
```

## `deliver` field values

- `"local"` — save output to disk only, no delivery.
- `"origin"` — deliver to the chat that created the job (from `origin`).
- `"<platform>"` — deliver to the platform's configured home channel (e.g. `TELEGRAM_HOME_CHANNEL` env var).
- `"<platform>:<chat_id>[:<thread_id>]"` — deliver to explicit target.
- Comma-separated: `"telegram,email:user@example.com"` — deliver to multiple targets.

Allowed platform names (validated against `_KNOWN_DELIVERY_PLATFORMS` to prevent env var enumeration):

```
telegram, discord, slack, whatsapp, signal, matrix, mattermost,
homeassistant, dingtalk, feishu, wecom, wecom_callback, weixin,
sms, email, webhook, bluebubbles, qqbot
```

## Home-channel env-var mapping

Each platform has a dedicated env var for its "home" chat:

```
MATRIX_HOME_ROOM, TELEGRAM_HOME_CHANNEL, DISCORD_HOME_CHANNEL,
SLACK_HOME_CHANNEL, SIGNAL_HOME_CHANNEL, MATTERMOST_HOME_CHANNEL,
SMS_HOME_CHANNEL, EMAIL_HOME_ADDRESS, DINGTALK_HOME_CHANNEL,
FEISHU_HOME_CHANNEL, WECOM_HOME_CHANNEL, WEIXIN_HOME_CHANNEL,
BLUEBUBBLES_HOME_CHANNEL, QQBOT_HOME_CHANNEL
```

Legacy names are aliased (e.g. `QQ_HOME_CHANNEL` → `QQBOT_HOME_CHANNEL`) so existing configs keep working.

## `skills` vs `skill`

Jobs support both legacy single-skill (`"skill": "name"`) and multi-skill (`"skills": ["a", "b"]`) forms. `_normalize_skill_list()` dedupes and preserves order; `_apply_skill_fields()` keeps both fields aligned. When loading skills at run time, missing skills are logged and skipped with a user-visible notice prepended to the prompt.

## `script` field

Optional data-collection script run before the LLM call. Must live in `~/.hermes/scripts/` — relative and absolute paths are both validated via `Path.resolve() + relative_to()` to block traversal. Output is captured, **secret-redacted** via `redact_sensitive_text()`, then injected at the top of the prompt. Timeout: default 120s, override via `HERMES_CRON_SCRIPT_TIMEOUT` env or `cron.script_timeout_seconds` in config.

## Invariants

- `advance_next_run(job_id)` runs BEFORE execution. If the process crashes mid-run, the recurring job won't re-fire on restart.
- One-shot jobs are left alone so they can retry on restart (within `ONESHOT_GRACE_SECONDS = 120`).
- `[SILENT]` as the **entire** final response suppresses delivery but still saves output to disk.

## Reference

- Schema + helpers: `cron/jobs.py:41-100`
- Delivery target resolution: `cron/scheduler.py:94-224`
- Pre-run script sandboxing: `cron/scheduler.py:486-564`
