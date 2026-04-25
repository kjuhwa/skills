---
name: multi-turn-repl-chatbot
description: Build an interactive CLI chatbot with a while loop that preserves conversation history across turns.
category: workflow
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, chatbot, repl, cli, conversation, multi-turn]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: src/agents/repl.py, examples/agent_patterns/routing.py
imported_at: 2026-04-18T00:00:00Z
---

# multi-turn-repl-chatbot

Build a CLI chatbot where each user input is added to the conversation history and the agent responds in-context. Uses `result.to_input_list()` to thread history between turns.

## When to apply

Quick CLI demos, developer testing tools, or customer-facing chat when you want simple conversation continuity without a full session backend.

## Core snippet

```python
import asyncio
import uuid
from agents import Agent, Runner, TResponseInputItem, trace

agent = Agent(
    name="Assistant",
    instructions="You are a helpful assistant.",
)

async def main():
    conversation_id = str(uuid.uuid4().hex[:16])
    inputs: list[TResponseInputItem] = []

    print("Chat with the agent. Type 'quit' to exit.\n")
    while True:
        user_input = input("You: ").strip()
        if not user_input or user_input.lower() == "quit":
            break

        inputs.append({"role": "user", "content": user_input})

        with trace("Chat turn", group_id=conversation_id):
            result = await Runner.run(agent, inputs)

        print(f"Agent: {result.final_output}\n")
        inputs = result.to_input_list()

asyncio.run(main())
```

## With streaming

```python
from openai.types.responses import ResponseTextDeltaEvent
from agents import Runner

async def chat_turn_streaming(agent, inputs):
    result = Runner.run_streamed(agent, inputs)
    print("Agent: ", end="", flush=True)
    async for event in result.stream_events():
        if event.type == "raw_response_event" and isinstance(event.data, ResponseTextDeltaEvent):
            print(event.data.delta, end="", flush=True)
    print()
    return result.to_input_list()
```

## Key notes

- `result.to_input_list()` includes all prior messages AND new agent responses
- Each turn gets its own trace; use `group_id=conversation_id` to link them in the dashboard
- For persistence across restarts, use `SQLiteSession` or `OpenAIConversationsSession` instead
- The SDK's built-in REPL: `from agents import run_demo_loop` for a quick testing harness
