---
version: 0.1.0-draft
name: guardrail-execution-model
summary: How input, output, and tool guardrails execute — when they run, parallel vs. blocking modes, tripwire semantics, and workflow boundaries.
category: llm-agents
confidence: high
tags: [openai-agents, guardrails, safety, tripwire, execution-model]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: docs/guardrails.md, src/agents/guardrail.py
imported_at: 2026-04-18T00:00:00Z
---

# Guardrail Execution Model

## Three Types

### 1. Input Guardrails
- Run on **initial user input** for the **first agent** in the chain only
- Default mode: **parallel** with agent execution (`run_in_parallel=True`)
  - Guardrail and agent start simultaneously; if guardrail trips, agent is cancelled
  - Agent may have already consumed tokens before cancellation
- Blocking mode: `@input_guardrail(run_in_parallel=False)` — agent never starts if guardrail trips
  - Better for cost control; no wasted tokens on rejected inputs
- Implemented via `@input_guardrail` decorator or `InputGuardrail` dataclass

### 2. Output Guardrails
- Run on **final output** of the **last agent** in the chain only
- Always post-completion (no parallel option)
- Implemented via `@output_guardrail` decorator or `OutputGuardrail` dataclass
- The `output` parameter receives the agent's typed output (matching `output_type`)

### 3. Tool Guardrails
- Run **per function-tool call**, regardless of agent position in the chain
- Input guardrail runs before tool execution; output guardrail runs after
- Apply only to `@function_tool` functions — NOT to hosted tools, computer/shell tools
- Configured on the tool object: `tool.tool_input_guardrails = [...]`

## Tripwire Semantics

`GuardrailFunctionOutput`:
- `tripwire_triggered=False` → pass through, agent continues
- `tripwire_triggered=True` → raises exception, execution halts

Exceptions:
- `InputGuardrailTripwireTriggered` — on input guardrail trip
- `OutputGuardrailTripwireTriggered` — on output guardrail trip
- `ToolOutputGuardrailTripwireTriggered` — on tool output guardrail trip with `.raise_exception()`

Tool guardrail return options:
- `ToolGuardrailFunctionOutput(output_info=...)` — pass through
- `.reject_content(message, output_info)` — skip tool call/output, return message to model, execution continues
- `.raise_exception(output_info)` — raise `ToolOutputGuardrailTripwireTriggered`, halt run

## Workflow Boundary Rules

| Guardrail type | When it runs | Which agent |
|---|---|---|
| Input | Before/during first agent turn | First agent only |
| Output | After last agent turn | Last (final output) agent only |
| Tool input | Before each function tool call | Any agent in chain |
| Tool output | After each function tool call | Any agent in chain |

If you need validation at every agent step, use tool guardrails rather than agent-level guardrails.

## Source paths
- `src/agents/guardrail.py` — InputGuardrail, OutputGuardrail
- `src/agents/tool_guardrails.py` — ToolInputGuardrail, ToolOutputGuardrail
- `src/agents/exceptions.py` — Tripwire exception classes
