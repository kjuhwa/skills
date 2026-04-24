---
name: agent-tracing-spans
description: Wrap multi-agent workflows in named traces and custom spans for debugging in the OpenAI Traces dashboard.
category: observability
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, tracing, spans, debugging, openai-traces-dashboard]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: docs/tracing.md
imported_at: 2026-04-18T00:00:00Z
---

# agent-tracing-spans

Use the `trace()` context manager to group multiple `Runner.run()` calls into a single workflow trace. Use `custom_span()` to add arbitrary spans. Built-in spans (agent, generation, tool, handoff) are created automatically.

## When to apply

Debugging complex multi-agent workflows, performance profiling, or monitoring production agent runs. The OpenAI Traces dashboard at `platform.openai.com/traces` visualizes the tree.

## Core snippet

```python
import asyncio
import uuid
from agents import Agent, Runner, trace, custom_span, gen_trace_id

agent = Agent(name="Assistant", instructions="Be helpful.")

async def main():
    conversation_id = str(uuid.uuid4().hex[:16])
    
    # Multiple runs in one trace
    with trace("My workflow", group_id=conversation_id):
        result1 = await Runner.run(agent, "Step 1 input")
        result2 = await Runner.run(agent, result1.to_input_list() + [{"role": "user", "content": "Step 2"}])
    
    # Custom spans for non-agent work
    with trace("Data pipeline"):
        with custom_span("fetch_data"):
            data = fetch_data()  # your code
        result = await Runner.run(agent, str(data))
```

## Background worker flush

```python
from agents import Runner, trace, flush_traces

# In Celery/FastAPI background tasks:
def run_agent_task(prompt: str):
    try:
        with trace("celery_task"):
            result = Runner.run_sync(agent, prompt)
        return result.final_output
    finally:
        flush_traces()  # Ensure immediate export
```

## Disable tracing

```python
from agents import set_tracing_disabled
set_tracing_disabled(True)  # Globally

# Per-run:
from agents import RunConfig
run_config = RunConfig(tracing_disabled=True)
result = await Runner.run(agent, "Hello", run_config=run_config)
```

## Key notes

- Tracing is enabled by default; disable with `OPENAI_AGENTS_DISABLE_TRACING=1` env var
- `trace(workflow_name, group_id=...)` groups multi-turn conversations
- `flush_traces()` blocks until buffered traces are exported (use in background workers)
- `gen_trace_id()` generates a valid `trace_<32_alphanumeric>` ID
