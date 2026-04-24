---
name: agent-handoff-routing
description: Route a conversation to a specialist agent via handoff, making that agent own the next turn.
category: llm-agents
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, handoffs, routing, multi-agent, triage]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: examples/agent_patterns/routing.py
imported_at: 2026-04-18T00:00:00Z
---

# agent-handoff-routing

List specialist agents in `Agent.handoffs`. A triage agent inspects the user message and calls `transfer_to_<agent_name>` to delegate. The specialist becomes the active agent for the remainder of the run.

## When to apply

Multi-language support, department routing (billing/support/refunds), or any scenario where the triage agent should not compose the final reply itself.

## Core snippet

```python
from agents import Agent, Runner, trace

french_agent = Agent(name="french_agent", instructions="You only speak French")
spanish_agent = Agent(name="spanish_agent", instructions="You only speak Spanish")
english_agent = Agent(name="english_agent", instructions="You only speak English")

triage_agent = Agent(
    name="triage_agent",
    instructions="Handoff to the appropriate agent based on the language of the request.",
    handoffs=[french_agent, spanish_agent, english_agent],
)

async def main():
    with trace("Routing example"):
        result = await Runner.run(triage_agent, "Bonjour, comment vas-tu?")
        print(result.final_output)
```

## With custom handoff description

```python
from agents import handoff

spanish_agent = Agent(
    name="Spanish Assistant",
    instructions="You only speak Spanish and are extremely concise.",
    handoff_description="A Spanish-speaking assistant.",  # Shown to triage LLM
)

triage_agent = Agent(
    name="triage_agent",
    handoffs=[handoff(spanish_agent, tool_name_override="speak_spanish")],
)
```

## Key notes

- Handoffs are represented as tools; the tool name defaults to `transfer_to_<agent_name>`
- After handoff, the specialist agent owns the active conversation — no narration from the triage agent
- Use `handoff_description` on the specialist to hint when the model should pick it
- For agents-as-tools (specialist helps but triage keeps control), use `Agent.as_tool()` instead
