---
name: multi-turn-conversation-history
description: Chain multiple agent turns by converting run results to input lists for the next call.
category: llm-agents
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, conversation, multi-turn, to-input-list, history]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: docs/running_agents.md
imported_at: 2026-04-18T00:00:00Z
---

# multi-turn-conversation-history

Use `result.to_input_list()` to build the conversation history from a previous turn, then append a new user message and pass it to the next `Runner.run()` call.

## When to apply

Stateless conversation loops (e.g., CLI chatbots) where you manage history explicitly instead of using a `Session` object. Also needed when you want to inspect or modify the history between turns.

## Core snippet

```python
import asyncio
from agents import Agent, Runner, TResponseInputItem

agent = Agent(name="Assistant", instructions="Be concise.")

async def main():
    inputs: list[TResponseInputItem] = []
    
    while True:
        user_input = input("You: ")
        if user_input.lower() == "quit":
            break
        
        # Append new user message to history
        inputs.append({"role": "user", "content": user_input})
        
        result = await Runner.run(agent, inputs)
        print(f"Agent: {result.final_output}")
        
        # Carry the full conversation (including agent responses) to next turn
        inputs = result.to_input_list()

asyncio.run(main())
```

## With tracing across turns

```python
import uuid
from agents import trace

conversation_id = str(uuid.uuid4().hex[:16])

async def run_turn(agent, inputs, user_msg):
    with trace("Chat turn", group_id=conversation_id):
        inputs.append({"role": "user", "content": user_msg})
        result = await Runner.run(agent, inputs)
        return result.final_output, result.to_input_list()
```

## Key notes

- `result.to_input_list()` returns a list of `TResponseInputItem` dicts (OpenAI Responses API format)
- The list includes prior inputs AND all new items (model responses, tool calls, outputs)
- For automatic history management, prefer `Session` objects instead
- `result.to_input_list(mode="normalized")` normalizes items for continuation after cancellation
