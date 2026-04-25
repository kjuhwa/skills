---
name: handoff-input-filter
description: Filter or transform the conversation history passed to a specialist agent on handoff.
category: llm-agents
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, handoffs, input-filter, history, context-pruning]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: examples/handoffs/message_filter.py
imported_at: 2026-04-18T00:00:00Z
---

# handoff-input-filter

Pass `input_filter` to `handoff()` to control what conversation history the specialist agent receives. Use built-in filters from `agents.extensions.handoff_filters` or write custom ones.

## When to apply

When specialist agents need a clean context (e.g., remove tool calls, trim early history, remove PII) rather than the full accumulated conversation from the triage agent.

## Core snippet

```python
from agents import Agent, HandoffInputData, Runner, handoff, trace
from agents.extensions import handoff_filters

def my_handoff_filter(data: HandoffInputData) -> HandoffInputData:
    # Remove all tool-related messages from history
    data = handoff_filters.remove_all_tools(data)
    
    # Optionally trim early history
    history = (
        tuple(data.input_history[2:])
        if isinstance(data.input_history, tuple)
        else data.input_history
    )
    return HandoffInputData(
        input_history=history,
        pre_handoff_items=tuple(data.pre_handoff_items),
        new_items=tuple(data.new_items),
    )

specialist = Agent(
    name="Spanish Assistant",
    instructions="You only speak Spanish and are extremely concise.",
    handoff_description="A Spanish-speaking assistant.",
)

triage = Agent(
    name="Assistant",
    instructions="If the user speaks Spanish, handoff to the Spanish assistant.",
    handoffs=[handoff(specialist, input_filter=my_handoff_filter)],
)
```

## Built-in filters

```python
from agents.extensions import handoff_filters
handoff_filters.remove_all_tools(data)       # Strip tool calls and outputs
handoff_filters.keep_last_n_items(data, 5)   # Keep only recent items
```

## Key notes

- `HandoffInputData` has `.input_history`, `.pre_handoff_items`, `.new_items`, `.run_context`
- Use `.clone(**kwargs)` to create a modified copy
- Filters run synchronously; keep them fast
- `nest_handoff_history` on `handoff()` controls whether history is nested under the new agent's turn
