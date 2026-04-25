---
name: custom-tracing-processor
description: Implement a TracingProcessor to forward agent traces to a custom backend (e.g., Langfuse, DataDog).
category: observability
version: 1.0.0
version_origin: extracted
confidence: medium
tags: [openai-agents, tracing, custom-processor, langfuse, monitoring]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: src/agents/tracing/processor_interface.py
imported_at: 2026-04-18T00:00:00Z
---

# custom-tracing-processor

Implement the `TracingProcessor` interface and register it with `add_trace_processor()` or `set_trace_processors()` to send spans to a custom observability backend.

## When to apply

When you need to export agent traces to systems other than the OpenAI Traces dashboard (e.g., Langfuse, DataDog, Honeycomb, custom databases).

## Core snippet

```python
from agents.tracing import TracingProcessor, Span, Trace
from agents import add_trace_processor, set_trace_processors

class MyTracingProcessor(TracingProcessor):
    def on_trace_start(self, trace: Trace) -> None:
        print(f"Trace started: {trace.trace_id} - {trace.workflow_name}")

    def on_trace_end(self, trace: Trace) -> None:
        print(f"Trace ended: {trace.trace_id}")

    def on_span_start(self, span: Span) -> None:
        pass  # Called when span opens

    def on_span_end(self, span: Span) -> None:
        # span.export() returns SpanData dict for export
        data = span.export()
        print(f"Span: {data['type']} - {data.get('data', {})}")

    def shutdown(self) -> None:
        pass  # Flush on process exit

    def force_flush(self) -> None:
        pass  # Synchronous flush

# Add alongside default processor
add_trace_processor(MyTracingProcessor())

# Or replace all processors
set_trace_processors([MyTracingProcessor()])
```

## Key notes

- `add_trace_processor()` adds to the existing processor list (keeps OpenAI dashboard)
- `set_trace_processors()` replaces all processors (removes default OpenAI export)
- `span.export()` returns a JSON-serializable dict with `type`, `data`, `started_at`, `ended_at`
- `on_span_end` is the primary hook for exporting data; spans are immutable after this point
- Implement `force_flush()` for background worker compatibility
