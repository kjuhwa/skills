---
name: agents-as-tools
description: Expose specialist agents as callable tools so an orchestrator agent retains control of the final answer.
category: llm-agents
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, agents-as-tools, orchestrator, manager-pattern]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: examples/agent_patterns/agents_as_tools.py
imported_at: 2026-04-18T00:00:00Z
---

# agents-as-tools

Call `agent.as_tool(tool_name, tool_description)` to expose a specialist as a callable tool. The orchestrator agent calls the specialist, gets its output, and composes the final reply — never handing off control.

## When to apply

When one agent should aggregate outputs from multiple specialists (e.g., translate to multiple languages then synthesize). Prefer handoffs when the specialist should own the final user response.

## Core snippet

```python
from agents import Agent, Runner, trace

spanish_agent = Agent(
    name="spanish_agent",
    instructions="You translate the user's message to Spanish",
    handoff_description="An english to spanish translator",
)
french_agent = Agent(
    name="french_agent",
    instructions="You translate the user's message to French",
    handoff_description="An english to french translator",
)

orchestrator_agent = Agent(
    name="orchestrator_agent",
    instructions=(
        "You are a translation agent. You use the tools given to you to translate. "
        "You never translate on your own, you always use the provided tools."
    ),
    tools=[
        spanish_agent.as_tool(
            tool_name="translate_to_spanish",
            tool_description="Translate the user's message to Spanish",
        ),
        french_agent.as_tool(
            tool_name="translate_to_french",
            tool_description="Translate the user's message to French",
        ),
    ],
)

async def main():
    with trace("Agents as tools"):
        result = await Runner.run(orchestrator_agent, "Good morning!")
        print(result.final_output)
```

## Key notes

- `as_tool()` runs the specialist in a nested agent loop; result returned as tool output string
- Orchestrator composes the final answer; user sees only orchestrator's output
- Combine with handoffs: triage can hand off to orchestrator which calls specialists as tools
- Tool guardrails apply to function tools; `as_tool()` runs through the handoff pipeline
