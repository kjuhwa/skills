---
name: handoff-with-typed-input
description: Provide structured data from the LLM to an on_handoff callback via input_type on handoff().
category: llm-agents
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, handoffs, typed-input, pydantic, on-handoff]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: docs/handoffs.md
imported_at: 2026-04-18T00:00:00Z
---

# handoff-with-typed-input

Pass `input_type` to `handoff()` so the LLM provides structured data when triggering the handoff. The `on_handoff` callback receives a parsed Pydantic model instance.

## When to apply

When you need to log a reason for escalation, capture structured context (e.g., customer ID, urgency level) as part of the handoff decision, or kick off data fetching when the handoff is invoked.

## Core snippet

```python
from pydantic import BaseModel
from agents import Agent, handoff, RunContextWrapper, Runner

class EscalationData(BaseModel):
    reason: str
    urgency: str  # "low" | "medium" | "high"

async def on_handoff(ctx: RunContextWrapper[None], input_data: EscalationData) -> None:
    print(f"Escalation reason: {input_data.reason}, urgency: {input_data.urgency}")
    # Kick off async tasks, log to database, etc.

escalation_agent = Agent(
    name="Escalation agent",
    instructions="Handle escalated customer issues.",
)

handoff_obj = handoff(
    agent=escalation_agent,
    on_handoff=on_handoff,
    input_type=EscalationData,
    tool_description_override="Escalate the issue with a reason and urgency level.",
)

triage_agent = Agent(
    name="Triage agent",
    instructions="Handle customer requests. Escalate if needed.",
    handoffs=[handoff_obj],
)

async def main():
    result = await Runner.run(triage_agent, "I urgently need help with a billing issue!")
    print(result.final_output)
```

## Key notes

- `input_type` must be a Pydantic `BaseModel`; the LLM fills it when triggering the handoff
- `on_handoff` can be async; its return value is ignored
- Without `input_type`, `on_handoff` receives only `RunContextWrapper` (no data)
- `is_enabled` accepts a bool or callable for dynamic enable/disable of the handoff
