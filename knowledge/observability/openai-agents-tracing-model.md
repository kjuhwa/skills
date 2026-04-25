---
version: 0.1.0-draft
name: openai-agents-tracing-model
summary: How the OpenAI Agents SDK tracing system works — traces vs. spans, automatic instrumentation, custom processors, and flush semantics.
category: observability
confidence: high
tags: [openai-agents, tracing, spans, traces, observability, debugging]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: docs/tracing.md, src/agents/tracing/
imported_at: 2026-04-18T00:00:00Z
---

# OpenAI Agents Tracing Model

## Traces vs. Spans

**Trace**: Represents one end-to-end workflow execution. Properties:
- `workflow_name`: logical name (e.g., "Customer support")
- `trace_id`: auto-generated `trace_<32_alphanumeric>` or user-provided
- `group_id`: links multiple traces from the same conversation thread
- `metadata`: optional key-value pairs

**Span**: Represents a single timed operation within a trace. Each span has:
- `started_at` / `ended_at` timestamps
- `trace_id` and `parent_id` (enabling tree structure)
- `span_data` (type-specific data payload)

## Automatic Instrumentation

The SDK automatically creates spans for:
- `agent_span` — each agent turn
- `generation_span` — each LLM call
- `function_span` — each function tool call
- `guardrail_span` — each guardrail execution
- `handoff_span` — each handoff
- `transcription_span` — audio-to-text (voice)
- `speech_span` / `speech_group_span` — text-to-speech (voice)
- `task_span` — sandbox task execution
- `mcp_tools_span` — MCP tool listing

The entire `Runner.run()` call is wrapped in a `trace()` automatically if not already in one.

## Grouping Multi-Turn Conversations

```python
with trace("My workflow", group_id=conversation_id):
    result1 = await Runner.run(agent, turn_1_input)
    result2 = await Runner.run(agent, turn_2_input)
```

All spans within the `with` block appear under the same trace in the dashboard.

## Custom Spans

```python
from agents.tracing import custom_span, function_span

with custom_span("my_operation", data={"key": "value"}):
    do_something()
```

## Processor Architecture

- `BatchTraceProcessor` (default): exports traces in background every few seconds or on queue fill
- On process exit: final flush is performed automatically
- For background workers (Celery, FastAPI): call `flush_traces()` after trace context closes

## Custom Processors

Implement `TracingProcessor` interface:
- `on_trace_start(trace)` / `on_trace_end(trace)`
- `on_span_start(span)` / `on_span_end(span)`
- `shutdown()` / `force_flush()`

Register with `add_trace_processor()` (keeps defaults) or `set_trace_processors()` (replaces).

## Disabling Tracing

- Global: `OPENAI_AGENTS_DISABLE_TRACING=1` env var
- Global in code: `set_tracing_disabled(True)`
- Per-run: `RunConfig(tracing_disabled=True)`
- ZDR organizations: tracing unavailable

## Sensitive Data

- `RunConfig(trace_include_sensitive_data=False)` — exclude tool args and outputs from spans
- Or: `OPENAI_AGENTS_TRACE_INCLUDE_SENSITIVE_DATA=false` env var
- Default is `true`

## Source paths
- `src/agents/tracing/` — full tracing implementation
- `src/agents/tracing/create.py` — span creation functions
- `src/agents/tracing/processor_interface.py` — TracingProcessor interface
- `src/agents/tracing/processors.py` — BatchTraceProcessor, default_exporter
