---
version: 0.1.0-draft
name: run-context-and-shared-state
summary: How RunContextWrapper provides typed shared state to tools and hooks without sending it to the LLM.
category: llm-agents
confidence: high
tags: [openai-agents, context, shared-state, dependency-injection, run-context]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: docs/context.md, src/agents/run_context.py
imported_at: 2026-04-18T00:00:00Z
---

# Run Context and Shared State

## Two Kinds of Context

The SDK uses "context" to mean two different things:

1. **Local context** (`RunContextWrapper`) — your app-defined state, NOT sent to the LLM
2. **LLM context** — the conversation messages the model sees

This document covers #1.

## RunContextWrapper

`RunContextWrapper[T]` is a wrapper around your typed context object. It is passed to:
- All `@function_tool` functions (as first param if declared)
- `RunHooks` / `AgentHooks` callbacks
- `on_handoff` callbacks
- Dynamic instructions functions
- Dynamic prompt functions

### Key attributes

| Attribute | Description |
|---|---|
| `wrapper.context` | Your app-defined object (mutable) |
| `wrapper.usage` | Cumulative `Usage` (requests, input_tokens, output_tokens) |
| `wrapper.tool_input` | Structured input when running as `Agent.as_tool()` |
| `wrapper.approve_tool(...)` | Programmatically approve a tool call |
| `wrapper.reject_tool(...)` | Programmatically reject a tool call |

### ToolContext subclass

For function-tool hooks, the SDK passes `ToolContext` (a subclass):
- `tool_context.tool_name` — name of the tool being called
- `tool_context.tool_call_id` — unique ID for the call
- `tool_context.tool_arguments` — raw JSON string of arguments

## Usage Pattern

```python
from dataclasses import dataclass
from agents import Agent, RunContextWrapper, Runner, function_tool

@dataclass
class AppContext:
    db: Database
    user_id: str
    logger: Logger

@function_tool
def fetch_user_profile(ctx: RunContextWrapper[AppContext]) -> str:
    """Fetch the current user's profile."""
    profile = ctx.context.db.get_user(ctx.context.user_id)
    ctx.context.logger.info(f"Fetched profile for {ctx.context.user_id}")
    return str(profile)

app_ctx = AppContext(db=db, user_id="123", logger=logger)
agent = Agent[AppContext](name="Assistant", tools=[fetch_user_profile])
result = await Runner.run(agent, "Show me my profile", context=app_ctx)
```

## Critical Rule

Every agent, tool, and hook in a single run must use the **same context type**. Mixing types causes type errors. Use `Agent[MyContext]` for type-checked access.

## Serialization Warning

Context is NOT serialized with `RunState`. If you persist `RunState` for HITL flows, avoid putting sensitive secrets in the context that would be exposed via serialized state.

## Source paths
- `src/agents/run_context.py` — RunContextWrapper, ToolContext
- `docs/context.md` — conceptual guide
