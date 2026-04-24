---
name: sqlite-session-persistence
description: Persist agent conversation history to SQLite for durable multi-turn sessions across process restarts.
category: session-management
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, sessions, sqlite, persistence, conversation-history]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: examples/memory/sqlite_session_example.py
imported_at: 2026-04-18T00:00:00Z
---

# sqlite-session-persistence

Use `SQLiteSession(session_id, db_path="...")` to persist conversation history to a local SQLite database. History survives process restarts and can be shared across multiple processes reading the same file.

## When to apply

Single-server deployments, CLI tools, or development environments where you need persistent multi-turn conversation without a separate database service.

## Core snippet

```python
import asyncio
from agents import Agent, Runner, SQLiteSession

agent = Agent(name="Assistant", instructions="Reply very concisely.")

async def main():
    session_id = "user_123_conversation"
    session = SQLiteSession(session_id, db_path="conversations.db")

    # Turn 1 — new conversation
    result = await Runner.run(
        agent,
        "What city is the Golden Gate Bridge in?",
        session=session,
    )
    print(f"Turn 1: {result.final_output}")

    # Turn 2 — history loaded from SQLite
    result = await Runner.run(agent, "What state is it in?", session=session)
    print(f"Turn 2: {result.final_output}")

asyncio.run(main())
# After process restart, run again with the same session_id — history is preserved
```

## Key notes

- Default `db_path` is `~/.agents_sessions.db` if not specified
- Session ID is the lookup key; use a stable per-user or per-conversation ID
- SQLite is single-writer; for multi-process writes, use `RedisSession` instead
- Install: `pip install openai-agents` (SQLite included); Redis: `pip install 'openai-agents[redis]'`
- History compaction can be enabled via `RunConfig(session_settings=SessionSettings(compaction=...))`
