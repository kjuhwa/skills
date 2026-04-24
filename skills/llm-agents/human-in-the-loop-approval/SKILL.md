---
name: human-in-the-loop-approval
description: Pause an agent run when a tool requires human approval, serialize state, and resume after the decision.
category: llm-agents
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, hitl, approval, run-state, interruptions, serialization]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: examples/agent_patterns/human_in_the_loop.py
imported_at: 2026-04-18T00:00:00Z
---

# human-in-the-loop-approval

Mark tool functions with `needs_approval=True` (static) or a callable for dynamic approval. When the agent calls such a tool, `result.interruptions` is populated. Serialize `RunState`, approve/reject, and resume.

## When to apply

Agentic tasks with irreversible side effects (email sending, file deletion, external API calls) where a human must confirm before execution.

## Core snippet

```python
import asyncio, json
from pathlib import Path
from agents import Agent, Runner, RunState, function_tool

@function_tool
async def get_weather(city: str) -> str:
    """Get weather for a city."""
    return f"The weather in {city} is sunny"

async def _needs_approval(_ctx, params, _call_id) -> bool:
    return "Oakland" in params.get("city", "")

@function_tool(needs_approval=_needs_approval)
async def get_temperature(city: str) -> str:
    """Get temperature for a city."""
    return f"The temperature in {city} is 20°C"

agent = Agent(
    name="Weather Assistant",
    instructions="Help with weather questions.",
    tools=[get_weather, get_temperature],
)

async def main():
    result = await Runner.run(agent, "What is the weather and temperature in Oakland?")

    while result.interruptions:
        state = result.to_state()
        # Optionally serialize: state_json = state.to_json()
        
        for interruption in result.interruptions:
            print(f"Approve {interruption.name}({interruption.arguments})? ")
            approved = True  # Replace with actual user input
            if approved:
                state.approve(interruption)
            else:
                state.reject(interruption)
        
        result = await Runner.run(agent, state)

    print(result.final_output)

asyncio.run(main())
```

## Key notes

- `result.interruptions` contains `ToolApprovalItem` objects with agent, tool name, and arguments
- `state.to_json()` / `RunState.from_json(agent, json)` enable cross-process or cross-request persistence
- `state.approve(interruption)` / `state.reject(interruption)` update approval state before resuming
- Streaming compatible: drain `stream_events()`, then check `result.interruptions`
