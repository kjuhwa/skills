---
name: openai-conversation-session
description: Persist conversation history across multiple Runner.run() calls automatically using OpenAIConversationsSession.
category: session-management
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, sessions, conversation-history, multi-turn]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: examples/memory/openai_session_example.py
imported_at: 2026-04-18T00:00:00Z
---

# openai-conversation-session

Create a `Session` instance and pass it to `Runner.run(session=...)`. The SDK automatically loads prior history and saves new items without manual `result.to_input_list()` management.

## When to apply

Multi-turn chatbots or agents where conversation history must persist across separate `Runner.run()` calls without manually threading input lists.

## Core snippet

```python
import asyncio
from agents import Agent, OpenAIConversationsSession, Runner

agent = Agent(name="Assistant", instructions="Reply very concisely.")

async def main():
    session = OpenAIConversationsSession()  # In-memory by default

    # First turn
    result = await Runner.run(agent, "What city is the Golden Gate Bridge in?", session=session)
    print(f"Turn 1: {result.final_output}")

    # Second turn — agent remembers prior context
    result = await Runner.run(agent, "What state is it in?", session=session)
    print(f"Turn 2: {result.final_output}")

    # Third turn
    result = await Runner.run(agent, "What's the population of that state?", session=session)
    print(f"Turn 3: {result.final_output}")

asyncio.run(main())
```

## Alternatives

```python
from agents import SQLiteSession, RedisSession  # pip install openai-agents[redis]

session = SQLiteSession("conversation_123")         # File-backed, persistent
session = SQLiteSession("user_123", db_path="chat.db")
```

## Key notes

- Session ID is the key for retrieving history; use a stable per-user or per-thread ID
- `OpenAIConversationsSession` uses the OpenAI Conversations API for server-side storage
- `SQLiteSession` is file-backed and survives process restarts
- `session` replaces manual `result.to_input_list()` chaining between turns
- Session history can be compacted to reduce token usage over long conversations
