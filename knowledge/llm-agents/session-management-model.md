---
version: 0.1.0-draft
name: session-management-model
summary: How the OpenAI Agents SDK session system manages conversation history across runs — backends, compaction, and integration with Runner.
category: llm-agents
confidence: high
tags: [openai-agents, sessions, conversation-history, multi-turn, sqlite, redis]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: docs/sessions/, src/agents/memory/
imported_at: 2026-04-18T00:00:00Z
---

# Session Management Model

## What Sessions Solve

Without sessions, each `Runner.run()` call is stateless. To continue a conversation, you must pass `result.to_input_list()` to the next call. Sessions automate this by:
1. Loading prior history from the backend before each run
2. Saving new items after each run
3. Optionally compacting long histories to manage token usage

## How It Works

When `session` is passed to `Runner.run(session=...)`:
1. SDK calls `session.get_items(session_id)` to load history
2. History is prepended to the current input
3. After the run, new items are saved via `session.add_items(session_id, new_items)`
4. If compaction is configured, the SDK may condense history

## Session Backends

| Backend | Class | Notes |
|---|---|---|
| OpenAI server-side | `OpenAIConversationsSession` | Uses OpenAI Conversations API; requires API key |
| SQLite | `SQLiteSession` | File-backed; survives restarts; single-writer |
| Redis | `RedisSession` | Multi-process safe; requires `openai-agents[redis]` |
| File | `FileSession` | Simple file-based storage |
| SQLAlchemy | Custom | Community examples available |
| In-memory | Default when no session | Lost between calls |

## Session ID

Session ID is the lookup key. Use a stable, per-conversation identifier:
- `SQLiteSession("user_123_thread_456")` — per user-thread
- `OpenAIConversationsSession(session_id="conv_123")`

## Compaction

Long conversations accumulate many tokens. Compaction summarizes old history:
```python
from agents import RunConfig
from agents.memory import SessionSettings

run_config = RunConfig(
    session_settings=SessionSettings(
        compaction_enabled=True,  # Auto-compact when history is long
    )
)
```

## Manual History Management (Alternative)

Without sessions:
```python
inputs = []
for user_msg in messages:
    inputs.append({"role": "user", "content": user_msg})
    result = await Runner.run(agent, inputs)
    inputs = result.to_input_list()  # Carry full history
```

Sessions are preferred when you don't need to inspect/modify history between turns.

## HITL Integration

Sessions work with human-in-the-loop flows. `RunState.to_json()` and `RunState.from_json()` serialize the state for cross-request persistence (separate from session history).

## Source paths
- `src/agents/memory/` — session implementations
- `src/agents/memory/session.py` — Session base class
- `docs/sessions/` — session guides and examples
- `examples/memory/` — concrete session examples
