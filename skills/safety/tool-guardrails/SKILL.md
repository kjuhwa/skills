---
name: tool-guardrails
description: Validate or block function tool inputs and outputs with @tool_input_guardrail and @tool_output_guardrail.
category: safety
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, tool-guardrails, function-tools, input-validation, output-validation]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: examples/basic/tool_guardrails.py
imported_at: 2026-04-18T00:00:00Z
---

# tool-guardrails

Attach `@tool_input_guardrail` / `@tool_output_guardrail` functions to `function_tool` objects. These run on every call to that tool, independent of agent-level guardrails.

## When to apply

When you need per-tool-call validation (block sensitive args, redact sensitive output, raise on dangerous patterns) that applies even in multi-agent pipelines where the tool isn't used by the first/last agent.

## Core snippet

```python
import json
from agents import (
    Agent, Runner, function_tool,
    ToolGuardrailFunctionOutput, ToolInputGuardrailData, ToolOutputGuardrailData,
    ToolOutputGuardrailTripwireTriggered,
    tool_input_guardrail, tool_output_guardrail,
)

@function_tool
def send_email(to: str, subject: str, body: str) -> str:
    """Send an email."""
    return f"Email sent to {to}"

@tool_input_guardrail
def reject_sensitive_words(data: ToolInputGuardrailData) -> ToolGuardrailFunctionOutput:
    args = json.loads(data.context.tool_arguments or "{}")
    for val in args.values():
        if "password" in str(val).lower():
            return ToolGuardrailFunctionOutput.reject_content(
                message="Tool call blocked: contains sensitive word",
                output_info={"blocked": "password"},
            )
    return ToolGuardrailFunctionOutput(output_info="ok")

@function_tool
def get_user_data(user_id: str) -> dict:
    """Get user data."""
    return {"user_id": user_id, "ssn": "123-45-6789"}

@tool_output_guardrail
def block_ssn_output(data: ToolOutputGuardrailData) -> ToolGuardrailFunctionOutput:
    if "ssn" in str(data.output).lower():
        return ToolGuardrailFunctionOutput.raise_exception(
            output_info={"blocked": "SSN in output"},
        )
    return ToolGuardrailFunctionOutput(output_info="ok")

# Attach guardrails to tools
send_email.tool_input_guardrails = [reject_sensitive_words]
get_user_data.tool_output_guardrails = [block_ssn_output]
```

## Return options

| Method | Effect |
|--------|--------|
| `ToolGuardrailFunctionOutput(output_info=...)` | Pass through (no blocking) |
| `.reject_content(message, output_info)` | Skip tool call/output, return message to model |
| `.raise_exception(output_info)` | Raise `ToolOutputGuardrailTripwireTriggered`, halt run |

## Key notes

- Tool guardrails apply only to `function_tool`; not to hosted tools, computer tool, or shell tool
- `data.context` exposes `tool_name`, `tool_call_id`, `tool_arguments`
- Multiple guardrails can be chained in the list; all must pass
