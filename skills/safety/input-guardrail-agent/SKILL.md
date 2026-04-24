---
name: input-guardrail-agent
description: Block off-topic or policy-violating user input before the main agent runs using @input_guardrail.
category: safety
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, guardrails, input-validation, safety, tripwire]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: examples/agent_patterns/input_guardrails.py
imported_at: 2026-04-18T00:00:00Z
---

# input-guardrail-agent

Decorate a function with `@input_guardrail` and attach it to an agent's `input_guardrails` list. If the guardrail's `tripwire_triggered=True`, an `InputGuardrailTripwireTriggered` exception is raised and the main agent never runs.

## When to apply

Cost-control (block expensive model before it runs), content moderation (off-topic check), or compliance (detect PII/malicious input). Run fast/cheap checks before the expensive main agent.

## Core snippet

```python
from pydantic import BaseModel
from agents import (
    Agent, GuardrailFunctionOutput, InputGuardrailTripwireTriggered,
    RunContextWrapper, Runner, TResponseInputItem, input_guardrail,
)

class MathHomeworkOutput(BaseModel):
    reasoning: str
    is_math_homework: bool

guardrail_agent = Agent(
    name="Guardrail check",
    instructions="Check if the user is asking you to do their math homework.",
    output_type=MathHomeworkOutput,
)

@input_guardrail
async def math_guardrail(
    context: RunContextWrapper[None], agent: Agent, input: str | list[TResponseInputItem]
) -> GuardrailFunctionOutput:
    result = await Runner.run(guardrail_agent, input, context=context.context)
    final_output = result.final_output_as(MathHomeworkOutput)
    return GuardrailFunctionOutput(
        output_info=final_output,
        tripwire_triggered=final_output.is_math_homework,
    )

main_agent = Agent(
    name="Customer support agent",
    instructions="You are a customer support agent.",
    input_guardrails=[math_guardrail],
)

async def main():
    try:
        result = await Runner.run(main_agent, "Can you help me solve 2+2?")
        print(result.final_output)
    except InputGuardrailTripwireTriggered:
        print("Guardrail triggered! This looks like math homework.")
```

## Key notes

- Input guardrails run only when the agent is the **first** agent in the chain
- Default mode: runs **in parallel** with the agent for best latency
- For blocking mode (agent never starts if guardrail fails): `@input_guardrail(run_in_parallel=False)`
- The guardrail function can be async or sync
- `output_info` is stored in the exception for downstream handling
