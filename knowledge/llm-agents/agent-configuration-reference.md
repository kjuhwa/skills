---
version: 0.1.0-draft
name: agent-configuration-reference
summary: Reference for all Agent configuration properties — instructions, tools, handoffs, guardrails, model settings, output types, and hooks.
category: llm-agents
confidence: high
tags: [openai-agents, agent, configuration, reference, api]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: docs/agents.md, src/agents/agent.py
imported_at: 2026-04-18T00:00:00Z
---

# Agent Configuration Reference

## Core Properties

| Property | Type | Description |
|---|---|---|
| `name` | `str` | Required. Human-readable agent name (also used in span names) |
| `instructions` | `str \| Callable` | System prompt or dynamic callable `(RunContextWrapper, Agent) -> str` |
| `prompt` | `dict` | OpenAI Responses API prompt config (`id`, `version`, `variables`) |
| `handoff_description` | `str` | Shown to triage LLM when this agent is offered as a handoff target |
| `handoffs` | `list[Agent \| Handoff]` | Agents this agent can hand off to |
| `model` | `str \| Model` | LLM to use; default is `gpt-4o` |
| `model_settings` | `ModelSettings` | Temperature, top_p, tool_choice, max_tokens, retry, etc. |
| `tools` | `list[Tool]` | Function tools, hosted tools, agents-as-tools |
| `mcp_servers` | `list[MCPServer]` | MCP-backed tool servers |
| `mcp_config` | `dict` | `convert_schemas_to_strict`, `failure_error_function` |
| `input_guardrails` | `list[InputGuardrail]` | Run on first agent's input |
| `output_guardrails` | `list[OutputGuardrail]` | Run on last agent's output |
| `output_type` | `type[BaseModel]` | Enforce structured output |
| `hooks` | `AgentHooks` | Agent-scoped lifecycle callbacks |
| `tool_use_behavior` | `str \| ToolsToFinalOutputResult` | Control whether tool results end the run |
| `reset_tool_choice` | `bool` | Reset `tool_choice` after first tool call (default `True`) |

## ModelSettings Properties

| Property | Description |
|---|---|
| `temperature` | Sampling temperature |
| `top_p` | Nucleus sampling |
| `max_tokens` | Max output tokens |
| `tool_choice` | `"auto" \| "required" \| "none" \| dict` |
| `parallel_tool_calls` | Allow parallel tool calls in one response |
| `retry` | `ModelRetrySettings` for backoff/retry |
| `truncation` | `"auto" \| "disabled"` |

## Instructions Callable

```python
def my_instructions(ctx: RunContextWrapper[MyContext], agent: Agent[MyContext]) -> str:
    return f"You help {ctx.context.user_name}."
# or async:
async def my_instructions(ctx, agent) -> str: ...
```

## tool_use_behavior

Controls when tool results end the run:
- `"run_llm_again"` (default) — always loop back to LLM after tool calls
- `"stop_on_first_tool"` — stop after any tool call, return tool result as final output
- Custom callable: `def behavior(ctx, results) -> ToolsToFinalOutputResult: ...`

## SandboxAgent Additional Properties

| Property | Description |
|---|---|
| `default_manifest` | Workspace definition (git repos, files, etc.) |
| `base_instructions` | Instructions prepended to `instructions` |
| `capabilities` | Enabled sandbox capabilities |
| `run_as` | User/permissions for sandbox execution |

## Source paths
- `src/agents/agent.py` — Agent dataclass definition
- `src/agents/model_settings.py` — ModelSettings dataclass
- `docs/agents.md` — full agents guide
