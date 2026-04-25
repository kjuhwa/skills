---
version: 0.1.0-draft
name: streaming-events-guide
summary: How streaming works in the OpenAI Agents SDK — event types, completion semantics, approval integration, and cancellation.
category: llm-agents
confidence: high
tags: [openai-agents, streaming, events, run-item-events, raw-response-events]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: docs/streaming.md, src/agents/stream_events.py
imported_at: 2026-04-18T00:00:00Z
---

# Streaming Events Guide

## Overview

`Runner.run_streamed()` returns `RunResultStreaming`. Iterate `result.stream_events()` to receive events as they arrive. **The run is not complete until the iterator is fully drained.**

## Event Types

### RawResponsesStreamEvent
Raw events from the LLM in OpenAI Responses API format:
- `event.type == "raw_response_event"`
- `event.data` is e.g. `ResponseTextDeltaEvent` (token), `ResponseOutputItemAddedEvent`, etc.
- Use for token-by-token text streaming

### RunItemStreamEvent
Higher-level semantic events (full items):
- `event.type == "run_item_stream_event"`
- `event.name` is one of:
  - `"message_output_created"` — full message assembled
  - `"tool_called"` — function/computer/shell tool was called
  - `"tool_search_called"` — ToolSearchTool invoked
  - `"tool_output"` — tool produced output
  - `"handoff_requested"` — LLM wants to hand off
  - `"handoff_occured"` — handoff completed
- `event.item` is the `RunItem` object

### AgentUpdatedStreamEvent
- `event.type == "agent_updated_stream_event"`
- `event.new_agent` — the agent that became active (after handoff)

## Completion Semantics

Post-processing (session persistence, approval bookkeeping, history compaction) can happen after the last visible token. Do not assume the run is done when text stops arriving — wait for the iterator to finish.

```python
result = Runner.run_streamed(agent, "input")
async for event in result.stream_events():
    pass  # Must drain fully

# Only check these AFTER draining:
print(result.is_complete)
print(result.final_output)
print(result.interruptions)
```

## Streaming with Tool Approval

```python
result = Runner.run_streamed(agent, "Delete temp files if safe.")
async for _ in result.stream_events():
    pass  # Drain fully

if result.interruptions:
    state = result.to_state()
    for interruption in result.interruptions:
        state.approve(interruption)
    result = Runner.run_streamed(agent, state)
    async for _ in result.stream_events():
        pass
```

## Cancellation

```python
result = Runner.run_streamed(agent, "Long task")
# Stop immediately:
result.cancel()
# Or let current turn finish:
result.cancel(mode="after_turn")
```

After `cancel(mode="after_turn")`, resume with `result.last_agent` and normalized input from `result.to_input_list(mode="normalized")`.

## Source paths
- `src/agents/stream_events.py` — StreamEvent types
- `src/agents/result.py` — RunResultStreaming
- `docs/streaming.md` — full streaming guide
