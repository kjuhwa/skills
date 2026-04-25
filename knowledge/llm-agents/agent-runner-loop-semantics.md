---
version: 0.1.0-draft
name: agent-runner-loop-semantics
summary: How the Runner agent loop works — turn logic, final output detection, tool call processing, and max_turns behavior.
category: llm-agents
confidence: high
tags: [openai-agents, runner, agent-loop, turns, tool-calls, handoffs]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: docs/running_agents.md, src/agents/run.py
imported_at: 2026-04-18T00:00:00Z
---

# Agent Runner Loop Semantics

## The Loop

The Runner executes a loop that does not terminate until one of: final output, max_turns exceeded, or an interruption (tool approval needed).

1. Call the current agent's LLM with the current input and tool schemas
2. The LLM returns a response with zero or more output items
3. For each item:
   - **Text output** with no tool calls = final output → exit loop
   - **Tool call** → execute the tool, append result, loop again
   - **Handoff** → switch active agent, update input, loop again
4. If `max_turns` is exceeded → raise `MaxTurnsExceeded` (default `max_turns=10`)

## Final Output Rule

An LLM response is treated as a "final output" only when:
- It produces text output (or structured output matching `output_type`)
- AND there are no tool calls in that response

If the model generates both text AND tool calls in the same response, the tool calls are processed and the loop continues.

## Input Types

`Runner.run(agent, input, ...)` accepts:
- `str` — treated as a user message
- `list[TResponseInputItem]` — OpenAI Responses API format (role/content pairs)
- `RunState` — resuming an interrupted run (after tool approval)

## RunResult

`RunResult` exposes:
- `result.final_output` — the final text or structured output
- `result.final_output_as(Model)` — typed access when `output_type` is set
- `result.new_items` — all items generated in this run
- `result.to_input_list()` — full conversation for the next turn
- `result.interruptions` — pending tool approvals (non-empty when run paused)
- `result.last_agent` — the agent that produced the final output

## Streaming Semantics

`Runner.run_streamed()` → `RunResultStreaming`:
- `result.stream_events()` is an async iterator of `StreamEvent` objects
- The run is NOT complete until the iterator is fully drained
- Post-processing (session persistence, approval state, history compaction) may happen after the last visible token
- `result.is_complete` is only accurate after the iterator ends

## Interruptions (Human-in-the-Loop)

When a tool has `needs_approval=True`:
- The runner pauses before executing that tool
- `result.interruptions` contains `ToolApprovalItem` objects
- Call `state = result.to_state()`, then `state.approve(interruption)` or `state.reject(interruption)`
- Resume with `Runner.run(agent, state)`

## Source paths
- `src/agents/run.py` — main Runner class
- `src/agents/run_config.py` — RunConfig, RunOptions, DEFAULT_MAX_TURNS
- `src/agents/result.py` — RunResult, RunResultStreaming
- `src/agents/run_state.py` — RunState for serialization/deserialization
