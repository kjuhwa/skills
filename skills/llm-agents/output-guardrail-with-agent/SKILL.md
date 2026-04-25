---
name: output-guardrail-with-agent
description: Use a fast/cheap agent to validate the main agent's output before returning it to the user.
category: llm-agents
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, output-guardrail, agent-validator, safety, quality]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: examples/agent_patterns/output_guardrails.py
imported_at: 2026-04-18T00:00:00Z
---

# output-guardrail-with-agent

Run a lightweight validator agent inside an `@output_guardrail` to check the main agent's output for policy violations, quality issues, or sensitive data before it reaches the user.

## When to apply

When output validation requires semantic understanding (not just regex) — e.g., checking if the response contains harmful advice, exposes sensitive info, or fails quality standards.

## Core snippet

```python
from pydantic import BaseModel
from agents import (
    Agent, GuardrailFunctionOutput, OutputGuardrailTripwireTriggered,
    RunContextWrapper, Runner, output_guardrail,
)

class CustomerResponse(BaseModel):
    reasoning: str
    response: str

class ValidationResult(BaseModel):
    is_safe: bool
    reason: str

validator_agent = Agent(
    name="Safety validator",
    instructions="Check if the customer service response contains any phone numbers or sensitive personal data.",
    output_type=ValidationResult,
)

@output_guardrail
async def safety_check(
    context: RunContextWrapper, agent: Agent, output: CustomerResponse
) -> GuardrailFunctionOutput:
    result = await Runner.run(validator_agent, output.response, context=context.context)
    validation = result.final_output_as(ValidationResult)
    return GuardrailFunctionOutput(
        output_info={"reason": validation.reason},
        tripwire_triggered=not validation.is_safe,
    )

main_agent = Agent(
    name="Customer service",
    instructions="Answer customer questions helpfully.",
    output_type=CustomerResponse,
    output_guardrails=[safety_check],
)

async def main():
    try:
        result = await Runner.run(main_agent, "What's the support number?")
        print(result.final_output.response)
    except OutputGuardrailTripwireTriggered as e:
        print(f"Response blocked: {e.output.output_info['reason']}")
```

## Key notes

- The guardrail agent can be a smaller, cheaper model (e.g., gpt-4o-mini)
- Pass `context=context.context` to share app state with the validator
- Output guardrails always run after the main agent completes
- Multiple output guardrails can be chained; all must pass
