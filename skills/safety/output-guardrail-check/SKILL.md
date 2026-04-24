---
name: output-guardrail-check
description: Validate or block agent output before returning it to the user using @output_guardrail.
category: safety
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, guardrails, output-validation, safety, sensitive-data]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: examples/agent_patterns/output_guardrails.py
imported_at: 2026-04-18T00:00:00Z
---

# output-guardrail-check

Decorate a function with `@output_guardrail` and attach it to `Agent.output_guardrails`. If the guardrail detects a problem, `tripwire_triggered=True` raises `OutputGuardrailTripwireTriggered`.

## When to apply

Preventing sensitive data leakage (PII, phone numbers, credentials) in agent replies, compliance filtering, or any post-generation validation.

## Core snippet

```python
from pydantic import BaseModel, Field
from agents import (
    Agent, GuardrailFunctionOutput, OutputGuardrailTripwireTriggered,
    RunContextWrapper, Runner, output_guardrail,
)

class MessageOutput(BaseModel):
    reasoning: str = Field(description="Thoughts on how to respond")
    response: str = Field(description="The response to the user")
    user_name: str | None = Field(description="User name if known")

@output_guardrail
async def sensitive_data_check(
    context: RunContextWrapper, agent: Agent, output: MessageOutput
) -> GuardrailFunctionOutput:
    phone_number_in_response = "650" in output.response
    return GuardrailFunctionOutput(
        output_info={"phone_in_response": phone_number_in_response},
        tripwire_triggered=phone_number_in_response,
    )

agent = Agent(
    name="Customer service",
    instructions="You are a helpful customer service agent.",
    output_type=MessageOutput,
    output_guardrails=[sensitive_data_check],
)

async def main():
    try:
        result = await Runner.run(agent, "What is the support phone number?")
        print(result.final_output)
    except OutputGuardrailTripwireTriggered as e:
        print(f"Output blocked: {e.output.output_info}")
```

## Key notes

- Output guardrails run only for the **last** (final) agent in the chain
- Output guardrails always run after the agent completes (no parallel option)
- `output` parameter type must match the agent's `output_type`
- `e.output.output_info` contains the diagnostic info set in the guardrail
