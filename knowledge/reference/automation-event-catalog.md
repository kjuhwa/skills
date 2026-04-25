---
version: 0.1.0-draft
name: automation-event-catalog
summary: Complete list of events fired on the per-workspace automation bus — LabelAdd/Remove, PermissionModeChange, FlagChange, SessionStatusChange, SchedulerTick, PreToolUse, PostToolUse, SessionStart/End.
category: reference
tags: [automations, events, event-bus]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/shared/src/automations
imported_at: 2026-04-18T00:00:00Z
---

# Automation event catalog

The per-workspace automation system (`packages/shared/src/automations/automation-system.ts`) exposes a typed event bus. Events users can match against in `automations.json`:

| Event | Payload | Fires on |
|---|---|---|
| `LabelAdd` | `{ sessionId, label }` | Session gets a new label (manual or auto). |
| `LabelRemove` | `{ sessionId, label }` | Label removed from a session. |
| `PermissionModeChange` | `{ sessionId, from, to }` | User cycles SHIFT+TAB or RPC sets mode. |
| `FlagChange` | `{ sessionId, isFlagged }` | Star/unstar. |
| `SessionStatusChange` | `{ sessionId, from, to }` | Todo → In Progress → Needs Review → Done (or custom). |
| `SchedulerTick` | `{ cron, timezone }` | Minute-granularity cron tick (if `enableScheduler: true`). |
| `PreToolUse` | `{ sessionId, tool, args }` | Before a tool is invoked (can veto). |
| `PostToolUse` | `{ sessionId, tool, result }` | After tool completes. |
| `SessionStart` | `{ sessionId }` | New session created. |
| `SessionEnd` | `{ sessionId }` | Session archived / deleted. |

### Matcher types
- **Regex** (`matcher: "^urgent$"`) — match against payload's primary field (label name, status, etc.).
- **Cron** (`cron: "0 9 * * 1-5", timezone: "America/New_York"`) — for `SchedulerTick`.
- **Filtrex expression** for complex guards.

### Action types (in order of expressiveness)
1. `prompt` — creates a new agent session with a prompt. Supports `@mentions` and `$CRAFT_LABEL`/`$CRAFT_SESSION_ID` variable substitution.
2. `webhook` — POSTs a JSON payload to a URL.
3. (implicit) audit entry in `automations-history.jsonl` for every matched rule.

### Example configuration
```jsonc
{
  "version": 2,
  "automations": {
    "SchedulerTick": [
      { "cron": "0 9 * * 1-5", "timezone": "America/New_York",
        "actions": [{ "type": "prompt", "prompt": "Check @github for new issues" }] }
    ],
    "LabelAdd": [
      { "matcher": "^urgent$",
        "actions": [{ "type": "prompt",
          "prompt": "An urgent label was added. Triage session $CRAFT_SESSION_ID." }] }
    ],
    "PermissionModeChange": [
      { "actions": [{ "type": "webhook", "url": "https://audit.example.com/mode" }] }
    ]
  }
}
```

### Dispose lifecycle
One `AutomationSystem` per workspace; `dispose()` tears down the bus, prompt/webhook/event-log handlers, and scheduler. SessionManager owns the lifecycle so opening/closing workspaces cleans up cleanly.
