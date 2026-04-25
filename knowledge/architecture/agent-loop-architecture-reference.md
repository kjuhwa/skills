---
version: 0.1.0-draft
name: agent-loop-architecture-reference
summary: Minimal ~100-line reference architecture for an LLM agent runner loop with generator-based streaming, StepOutcome exit semantics, and periodic tool-schema reset.
category: architecture
tags: [llm-agents, reference, architecture, python, streaming]
source_type: extracted-from-git
source_url: https://github.com/lsdefine/GenericAgent.git
source_ref: main
source_commit: ec34b7e1c0f11fbb9709680ccfe313187a1b942b
source_project: GenericAgent
source_path: agent_loop.py
imported_at: 2026-04-18T00:00:00Z
confidence: high
---

# Agent-loop architecture reference

A compact reference for what a "good enough" single-file agent runner looks like. Roughly 100 lines of Python; no framework. Useful as a mental model when evaluating larger frameworks or building your own. The concrete code is in GenericAgent's `agent_loop.py`.

## Shape of the loop

```
agent_runner_loop(client, system_prompt, user_input, handler, tools_schema, max_turns=40)
  messages = [system, user]
  for turn in 1..max_turns:
      response = client.chat(messages, tools=tools_schema)    # may yield progress
      tool_calls = parse(response.tool_calls) or [{no_tool}]

      for tc in tool_calls:
          outcome = handler.dispatch(tc.name, tc.args, response, index=i)
          if outcome.should_exit:  exit_reason = EXITED; break
          if outcome.next_prompt is None:  exit_reason = TASK_DONE; break
          tool_results.append({id, serialized outcome.data})
          next_prompts.add(outcome.next_prompt)

      if no next_prompts or exit_reason:
          if handler._done_hooks: next_prompts.add(handler._done_hooks.pop(0))
          else: break
      next_prompt = handler.turn_end_callback(...)
      messages = [{"role": "user", "content": next_prompt, "tool_results": ...}]

  return exit_reason or {'result': 'MAX_TURNS_EXCEEDED'}
```

## Load-bearing design choices

### 1. Generators end-to-end

Both `client.chat()` and `handler.dispatch()` are generators. The top-level loop is a generator too. That means every token and every tool's progress output reaches the caller in real time, but the final return value (via `StopIteration.value`) is still a clean Python object. No async/await, no callback hell, no "where did my return go."

Supporting helper:

```python
def exhaust(g):
    try:
        while True: next(g)
    except StopIteration as e:
        return e.value
```

Lets you run a generator in non-verbose mode (swallowing progress yields) while still recovering the return value.

### 2. `StepOutcome` as the unit of exit semantics

Three fields, three meanings (see `handler-dispatch-pattern-with-tool-callbacks` skill for details):

| Field | Meaning |
|---|---|
| `data` | What to feed back as a tool_result on next turn |
| `next_prompt` | Next user message; `None` signals "task done" |
| `should_exit` | Immediate termination |

### 3. Multiple-tool-call aggregation per turn

Modern LLM APIs let the model emit several tool calls in one turn. The loop dispatches them all, aggregates `next_prompt` into a **set** (dedups identical nudges from different tools), and joins them with newline for the next round.

### 4. Exit-reason decision logic

The loop exits early when:
- ANY tool returns `should_exit=True` (explicit termination).
- ANY tool returns `next_prompt=None` (that tool claimed the task is done).

Both are aggressive short-circuits. In practice the model learns to only return `None` when it really is done (otherwise progress stalls).

### 5. `_done_hooks` — scheduled end-of-task callbacks

When the loop would otherwise exit, it first drains `handler._done_hooks` (a queue of scheduled follow-up prompts). This is how the handler schedules a "before you finish, re-read the autonomous-operation SOP and double-check your cleanup" message. Each hook pops off and becomes one more turn of prompting.

### 6. Periodic tool-schema reset

```python
if turn % 10 == 0: client.last_tools = ''
```

Every 10 turns, the tool-schema cache is reset so the next request re-sends the full tool list. Rationale: as the message history grows, tool schemas repeated N times eat context; periodically flushing forces a refresh but doesn't spam every turn.

### 7. History is in the session, not the loop

The loop body sends **only the new user turn and its tool results** in each request:

```python
messages = [{"role": "user", "content": next_prompt, "tool_results": tool_results}]
```

History is managed by the `client` (a session-bearing wrapper around the LLM SDK). This separation lets the client apply history compression, trimming, and caching independently of the loop logic.

## Helpers worth noting

### `_clean_content` — shrink verbose LLM chatter

```python
def _clean_content(text):
    # Truncate long code blocks to 5 lines + "... (N lines)"
    # Strip <file_content>, <tool_use>, and 3+ blank lines
```

Runs on the LLM's content string in non-verbose mode. Long responses get compressed for stdout display without mutating the actual message history.

### `_compact_tool_args` — log-line compaction

Shortens tool args for log display: drops `_index`, basenames `path`, truncates JSON to 120 chars. Keeps per-turn logs scannable.

## Assumptions this loop bakes in

- The LLM API returns tool calls in a known shape (`tc.function.name`, `tc.function.arguments` as JSON string, `tc.id`). Adapt for Anthropic-style tool_use blocks vs OpenAI-style function_call.
- The `handler` exposes `dispatch`, `turn_end_callback`, `_done_hooks` (list). See the companion skill for the Handler contract.
- `max_turns=40` is a sane default for multi-step work. Reduce for cost-sensitive flows; increase for research-mode agents.

## What to imitate

- The tiny `StepOutcome` dataclass. Encodes exit semantics without enum ceremony.
- Generators for progress, `StopIteration.value` for return. No async necessary.
- Per-turn aggregation of next_prompts into a set.
- `_done_hooks` queue for "on task completion, do X" without touching the happy path.

## What to reconsider

- Truncating response cache every 10 turns is a bit magic — the threshold isn't tuned; 10 is a guess. Measure if moving to production.
- Single `client.chat` call per turn means no streaming-of-streaming parallelism. Fine for single-agent; rework for multi-agent.
- `next_prompt=None` doubles as "task done"; conflating this with empty-prompt has occasionally confused model outputs in the wild. Consider a separate explicit "done" sentinel.

---

Reference extracted from `agent_loop.py` at commit `ec34b7e`. The source is ~100 lines and readable end-to-end; see the full file for the exact wiring.
