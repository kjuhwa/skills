---
version: 0.1.0-draft
name: human-in-the-loop-design
summary: How human-in-the-loop (HITL) flows work in the OpenAI Agents SDK — tool approval, RunState serialization, streaming compatibility.
category: llm-agents
confidence: high
tags: [openai-agents, hitl, approval, run-state, interruptions, serialization]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: docs/human_in_the_loop.md, examples/agent_patterns/human_in_the_loop.py
imported_at: 2026-04-18T00:00:00Z
---

# Human-in-the-Loop Design

## Concept

The SDK provides a native pause-and-resume mechanism for agent runs. When a tool requires approval, the runner pauses before executing it, yielding control to your code. After you approve or reject, the run resumes.

## Approval Configuration

```python
# Static approval (always requires approval)
@function_tool(needs_approval=True)
def delete_files(path: str) -> str: ...

# Dynamic approval (based on arguments)
async def needs_approval_fn(ctx, params: dict, call_id: str) -> bool:
    return "production" in params.get("environment", "")

@function_tool(needs_approval=needs_approval_fn)
def deploy(environment: str) -> str: ...
```

## Approval Flow

1. `result = await Runner.run(agent, input)` — run may pause
2. Check `result.interruptions` — non-empty if approval needed
3. `state = result.to_state()` — convert to serializable `RunState`
4. `state.approve(interruption)` or `state.reject(interruption)` for each
5. `result = await Runner.run(agent, state)` — resume

## RunState Serialization

```python
# Serialize (for cross-request persistence)
state_json = state.to_json()
# Store in DB, Redis, file...

# Deserialize and resume
state = await RunState.from_json(agent, stored_state_json)
result = await Runner.run(agent, state)
```

Enables HITL across HTTP requests, Celery tasks, or async jobs.

## Streaming Compatibility

Streaming + HITL: drain the stream, then check interruptions.
```python
result = Runner.run_streamed(agent, input)
async for _ in result.stream_events():
    pass  # Must fully drain

if result.interruptions:
    state = result.to_state()
    for i in result.interruptions:
        state.approve(i)  # or state.reject(i)
    result = Runner.run_streamed(agent, state)
    async for _ in result.stream_events():
        pass
```

## ToolApprovalItem

`result.interruptions` contains `ToolApprovalItem` objects:
- `.agent` — the agent that wants to call the tool
- `.name` — tool name
- `.arguments` — JSON string of arguments
- `.call_id` — unique tool call identifier

## Design Considerations

- `RunState` serializes tool approval state, pending calls, and conversation items — NOT your context object
- Avoid putting secrets in the context if you intend to serialize state
- One `RunState.from_json()` per agent; if multiple agents share the run, keep a reference to the agent that produced the interruption
- `RunState` is the single source of truth for resuming; do not construct it manually

## Source paths
- `docs/human_in_the_loop.md` — full HITL guide
- `src/agents/run_state.py` — RunState
- `src/agents/items.py` — ToolApprovalItem
- `examples/agent_patterns/human_in_the_loop.py` — runnable example
