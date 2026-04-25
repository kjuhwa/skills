---
version: 0.1.0-draft
name: hermes-hook-system-yaml-handler
summary: Lifecycle event hook system — discover HOOK.yaml + handler.py dirs, fire events, errors don't block.
category: reference
tags: [hooks, events, lifecycle, plugins, python]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Hermes Event Hook System

A lightweight discovery-based event system where a user drops a directory into `~/.hermes/hooks/<name>/` and its handler automatically fires at configured lifecycle events.

## Directory convention

```
~/.hermes/hooks/<name>/
├── HOOK.yaml      # metadata (name, description, events list)
└── handler.py     # top-level `handle(event_type, context)` — sync or async
```

See `gateway/hooks.py:1-100`.

## Events emitted

| Event | Fires when |
|-------|-----------|
| `gateway:startup` | Gateway process starts |
| `session:start` | First message of a new session |
| `session:end` | `/new` or `/reset` issued |
| `session:reset` | After the new session entry is created |
| `agent:start` | Agent begins processing a message |
| `agent:step` | Each turn of the tool-calling loop |
| `agent:end` | Agent finishes a message |
| `command:*` | Any slash command executed (wildcard match) |

## HOOK.yaml shape

```yaml
name: boot-md
description: Run ~/.hermes/BOOT.md on gateway startup
events:
  - gateway:startup
# optional: platforms: [telegram, cli]
```

## Registry flow (`HookRegistry`)

```python
registry = HookRegistry()
registry.discover_and_load()                      # scan ~/.hermes/hooks/
await registry.emit("agent:start", {"platform": "telegram", ...})
```

- `discover_and_load()` registers built-ins first, then scans user directory.
- Each discovered handler is loaded via `importlib.util.spec_from_file_location` so the hook dir isn't forced onto `sys.path`.
- The handler function can be sync or async — `emit()` inspects via `asyncio.iscoroutinefunction` and awaits appropriately.
- **Errors in hooks are caught and logged but never block the main pipeline.** A buggy hook can't crash the agent or gateway.

## Built-in hooks

Registered before user hooks so startup boot-scripts always run:

- `boot-md` — executes `~/.hermes/BOOT.md` as an initial prompt when the gateway starts, if present. See `gateway/builtin_hooks/boot_md.py`.

## Context payload

Each event passes a dict with event-specific keys:

```python
# agent:start
{"platform": "telegram", "user_id": "123", "session_id": "abc",
 "message": "...", "cwd": "/path"}

# session:end
{"platform": "cli", "session_id": "abc", "reason": "user_reset"}

# command:*
{"platform": "cli", "command": "model", "args": "anthropic/claude"}
```

## Why this shape

- **Directory-based discovery** over an `entry_points` or decorators scheme means users don't need to install a Python package — just drop a folder.
- **Separate YAML from handler** keeps metadata readable without importing the handler (lets `hermes hooks list` be cheap).
- **Failure isolation** matters because users run experimental hooks. A typo shouldn't break their morning Telegram bot.

## Reference

- `gateway/hooks.py` — registry implementation
- `gateway/builtin_hooks/boot_md.py` — reference handler
- `AGENTS.md` sections about hook discovery
